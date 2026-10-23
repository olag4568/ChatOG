"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Account created! Check your email to confirm your account."
    );
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
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none focus:border-blue-500"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none focus:border-blue-500"
          required
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-500"
        >
          Sign Up
        </button>

        {message && (
          <p className="text-center text-sm text-green-400">
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