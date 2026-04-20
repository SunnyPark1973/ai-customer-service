"use client";

import { createBrowserClient } from "@supabase/ssr";

export default function Home() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

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
