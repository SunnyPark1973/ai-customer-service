"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [business, setBusiness] = useState<any>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [themeColor, setThemeColor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/");
      } else {
        setUser(data.user);
        const { data: biz } = await supabase
          .from("Business")
          .select("*")
          .eq("user_id", data.user.id)
          .single();
        if (biz) {
          setBusiness(biz);
          setName(biz.name || "");
          setIndustry(biz.industry || "");
          setPhone(biz.phone || "");
          setThemeColor(biz.theme_color || "#3B82F6");
          setLogoUrl(biz.logo_url || "");
        }
        loadFiles(data.user.id);
      }
    });
  }, []);

  const loadFiles = async (userId: string) => {
    const { data } = await supabase.storage
      .from("business-files")
      .list(userId);
    if (data) setFiles(data);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLogoUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      await supabase.from("Business").upsert({
        user_id: user.id, logo_url: urlData.publicUrl
      }, { onConflict: "user_id" });
    }
    setLogoUploading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const { error } = await supabase.storage
      .from("business-files")
      .upload(`${user.id}/${Date.now()}.${file.name.split('.').pop()}`, file, { upsert: true });
    if (!error) {
      await loadFiles(user.id);
      alert("파일이 업로드되었습니다!");
    } else {
      alert("업로드 실패: " + error.message);
    }
    setUploading(false);
  };

  const handleDeleteFile = async (fileName: string) => {
    await supabase.storage
      .from("business-files")
      .remove([`${user.id}/${fileName}`]);
    await loadFiles(user.id);
  };

  const handleSave = async () => {
    setSaving(true);
    if (business) {
      await supabase.from("Business").update({
        name, industry, phone, theme_color: themeColor
      }).eq("user_id", user.id);
    } else {
      await supabase.from("Business").insert({
        user_id: user.id, name, industry, phone, theme_color: themeColor, logo_url: logoUrl
      });
    }
    setSaving(false);
    alert("저장되었습니다!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const colors = ["#3B82F6","#EC4899","#8B5CF6","#10B981","#F59E0B","#EF4444","#000000"];

  if (!user) return <div className="flex items-center justify-center min-h-screen">로딩중...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav style={{borderBottom: `2px solid ${themeColor}`}} className="bg-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="logo" className="w-8 h-8 rounded-full object-cover" />}
          <div style={{background: !logoUrl ? themeColor : "transparent"}} className={!logoUrl ? "w-2 h-2 rounded-full" : ""}></div>
          <h1 className="text-xl font-bold text-gray-900">{name || "AI 고객상담 관리자"}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">로그아웃</button>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-56 min-h-screen bg-white border-r border-gray-200 p-4">
          <ul className="space-y-1">
            {[
              { id: "profile", label: "업체 정보" },
              { id: "files", label: "파일 업로드" },
              { id: "chat", label: "채팅 모니터링" },
              { id: "reports", label: "리포트" },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  style={activeTab === item.id ? {background: `${themeColor}20`, color: themeColor} : {}}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id ? "" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1 p-8">
          {activeTab === "profile" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">업체 정보</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">업체 로고</label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 cursor-pointer"
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="logo" className="w-20 h-20 rounded-full object-cover mx-auto" />
                    ) : (
                      <p className="text-gray-400 text-sm">{logoUploading ? "업로드 중..." : "클릭하여 로고 업로드"}</p>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상호명</label>
                    <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="예) 강남 성형외과" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">업종</label>
                    <input value={industry} onChange={e => setIndustry(e.target.value)} type="text" placeholder="예) 성형외과, 쇼핑몰, 마트" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">대표 연락처</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="text" placeholder="예) 02-1234-5678" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">테마 컬러</label>
                    <div className="flex gap-2 flex-wrap">
                      {colors.map(c => (
                        <button key={c} onClick={() => setThemeColor(c)}
                          style={{background: c, border: themeColor === c ? "3px solid #000" : "3px solid transparent"}}
                          className="w-8 h-8 rounded-full" />
                      ))}
                      <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer border-0" />
                    </div>
                  </div>
                  <button onClick={handleSave} style={{background: themeColor}} className="w-full text-white py-2 rounded-lg text-sm font-medium hover:opacity-90">
                    {saving ? "저장 중..." : "저장하기"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">파일 업로드</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
                <p className="text-sm text-gray-500 mb-4">AI 학습용 파일을 업로드하세요. PDF 형식을 권장합니다.</p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 cursor-pointer mb-6"
                >
                  <p className="text-gray-400">{uploading ? "업로드 중..." : "PDF, TXT 파일을 클릭하여 업로드"}</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv" onChange={handleFileUpload} className="hidden" />
                {files.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">업로드된 파일</h3>
                    <ul className="space-y-2">
                      {files.map(f => (
                        <li key={f.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                          <span className="text-sm text-gray-700">📄 {f.name}</span>
                          <button onClick={() => handleDeleteFile(f.name)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">채팅 모니터링</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-400 text-sm">아직 채팅 내역이 없습니다.</p>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">리포트</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-400 text-sm">아직 리포트가 없습니다.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
