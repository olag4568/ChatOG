"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth_callback") {
      setMessage("Google sign-in could not be completed. Check the Supabase Google provider and redirect URL settings, then try again.");
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
      }
    } catch {
      setMessage("Could not start Google sign-in. Check your Supabase URL, anon key, and Google provider settings.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">
              Welcome back to{" "}
              <span className="text-blue-500">OLANIX</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to your account
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#292929] bg-[#111] p-3 text-sm font-medium transition hover:bg-[#181818] disabled:opacity-50"
          >
            <span className="text-lg font-bold">G</span>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-[#292929]" />
            <span className="text-xs text-gray-600">OR</span>
            <div className="h-px flex-1 bg-[#292929]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none transition focus:border-blue-500"
              autoComplete="email"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none transition focus:border-blue-500"
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in with email"}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-red-400">
              {message}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-500 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
