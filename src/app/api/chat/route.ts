import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = "gemini-1.5-flash";
const FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-001",
];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

type ChatMessage = { role: "user" | "assistant"; content: string };
type GeminiData = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
};

async function listGenerateModels(apiKey: string): Promise<string[]> {
  const url = `${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: "GET", headers: { "content-type": "application/json" } });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };

  return (
    data.models
      ?.filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(Boolean) ?? []
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const raw = body as { messages?: unknown };
  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    return NextResponse.json({ error: "messages가 필요합니다." }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  for (const item of raw.messages) {
    if (
      item &&
      typeof item === "object" &&
      "role" in item &&
      "content" in item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" &&
      item.content.trim()
    ) {
      messages.push({ role: item.role, content: item.content.trim() });
    }
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "유효한 메시지가 없습니다." }, { status: 400 });
  }

  const preferredModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const availableModels = await listGenerateModels(apiKey);
  const dynamicCandidates = availableModels.filter(
    (m) =>
      m === preferredModel ||
      m.includes("gemini-flash-latest") ||
      m.includes("gemini-2.0-flash") ||
      m.includes("gemini-1.5-flash"),
  );
  const modelCandidates = [
    preferredModel,
    ...FALLBACK_MODELS,
    ...dynamicCandidates,
    ...availableModels.slice(0, 8),
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  let data: GeminiData | undefined;
  let lastStatus = 502;
  let lastDetail = "";
  let lastModel = preferredModel;

  for (const modelName of modelCandidates) {
    const url = `${GEMINI_BASE}/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(
      apiKey,
    )}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are a professional customer support assistant. Be helpful, accurate, and concise. Reply in the same language the customer writes in.",
            },
          ],
        },
        contents,
      }),
    });

    if (res.ok) {
      data = (await res.json()) as GeminiData;
      lastModel = modelName;
      break;
    }

    lastStatus = res.status;
    lastDetail = await res.text().catch(() => "");
    console.error("Gemini API error:", modelName, res.status, lastDetail);
  }

  if (!data) {
    const authOrQuota =
      lastStatus === 401 || lastStatus === 403 || lastStatus === 429;
    return NextResponse.json(
      {
        error:
          authOrQuota
            ? "Gemini API 키 권한/요금제/쿼터를 확인해 주세요."
            : "AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: authOrQuota ? lastStatus : 502 },
    );
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => (typeof p.text === "string" ? p.text : ""))
      .join("") ?? "";

  if (!text) {
    const blockReason = data.promptFeedback?.blockReason;
    const finishReason = data.candidates?.[0]?.finishReason;
    console.error("Gemini API empty response:", {
      model: lastModel,
      blockReason,
      finishReason,
      detail: lastDetail,
    });
    return NextResponse.json(
      {
        error:
          blockReason || finishReason === "SAFETY"
            ? "안전 정책으로 인해 답변이 차단되었습니다. 표현을 완화해 다시 시도해 주세요."
            : "빈 응답이 반환되었습니다.",
      },
      { status: blockReason ? 400 : 502 },
    );
  }

  return NextResponse.json({ text });
}
