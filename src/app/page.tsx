"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
        <h1 className="text-2xl font-bold mb-4">AI 고객상담 서비스</h1>
        <p className="mb-6 text-gray-600">안녕하세요, {user.email} 님!</p>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <h1 className="text-2xl font-bold mb-6">AI 고객상담 서비스</h1>
      <button
        onClick={handleGoogleLogin}
        className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 shadow"
      >
        Google로 로그인
      </button>
    </div>
  );
}
