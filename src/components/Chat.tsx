"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

export type ChatMessage = { id: string; role: Role; content: string };

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    const userMsg: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const payload = nextHistory.map(({ role, content }) => ({
        role,
        content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });

      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "요청에 실패했습니다.");
      }

      if (!data.text) {
        throw new Error("응답이 비어 있습니다.");
      }

      setMessages((prev) => [
        ...prev,
        { id: createId(), role: "assistant", content: data.text! },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-[min(720px,calc(100dvh-8rem))] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          고객 상담
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          질문을 남겨 주시면 AI 상담원이 답변해 드립니다.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <p className="m-auto max-w-sm text-center text-sm text-zinc-400 dark:text-zinc-500">
            아래 입력창에 문의 내용을 적어 주세요.
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2.5 text-[15px] leading-relaxed text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "max-w-[85%] rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-2.5 text-[15px] leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              }
            >
              <span className="whitespace-pre-wrap break-words">{m.content}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-100 p-3 dark:border-zinc-800">
        <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
          <textarea
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            placeholder="메시지를 입력하세요…"
            rows={1}
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="메시지 입력"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            보내기
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Enter로 전송 · Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  );
}
