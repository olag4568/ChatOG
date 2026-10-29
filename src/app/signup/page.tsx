"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@gmail\.com$/i.test(normalizedEmail)) {
      setMessage("Please use a Gmail address ending in @gmail.com.");
      return;
    }

    if (password.length < 6) {
      setMessage("Your password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Account created! Check your Gmail inbox to confirm your account.");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md space-y-5 rounded-2xl border border-[#222] bg-[#0a0a0a] p-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Create your{" "}
            <span className="text-blue-500">OLANIX</span>{" "}
            account
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Create an account to use OLANIX
          </p>
        </div>

        <input
          type="email"
          placeholder="Gmail address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          autoComplete="email"
          className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none focus:border-blue-500"
          required
        />

        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none focus:border-blue-500"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-500"
        >
          Sign Up
        </button>

        {message && (
          <p role="status" className={`text-center text-sm ${message.startsWith("Account created") ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-blue-500 hover:underline"
          >
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}