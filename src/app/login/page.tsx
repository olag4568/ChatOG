"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [showPhone, setShowPhone] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // EMAIL + PASSWORD LOGIN
  // =========================
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

  // =========================
  // GOOGLE LOGIN
  // =========================
  async function handleGoogleLogin() {
    setLoading(true);
    setMessage("");

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
  }

  // =========================
  // APPLE LOGIN
  // =========================
  async function handleAppleLogin() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  // =========================
  // SEND PHONE OTP
  // =========================
  async function handleSendOTP() {
    if (!phone) {
      setMessage("Please enter your phone number.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setOtpSent(true);
    setMessage("OTP sent to your phone.");
    setLoading(false);
  }

  // =========================
  // VERIFY PHONE OTP
  // =========================
  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();

    if (!otp) {
      setMessage("Please enter the OTP.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-8 shadow-2xl">

          {/* HEADER */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">
              Welcome back to{" "}
              <span className="text-blue-500">OLANIX</span>
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Sign in to your account
            </p>
          </div>

          {/* GOOGLE + APPLE */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#292929] bg-[#111] p-3 text-sm font-medium transition hover:bg-[#181818] disabled:opacity-50"
            >
              <span className="text-lg font-bold">G</span>
              Google
            </button>

            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#292929] bg-[#111] p-3 text-sm font-medium transition hover:bg-[#181818] disabled:opacity-50"
            >
              <span className="text-lg"></span>
              Apple
            </button>
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-[#292929]" />

            <span className="text-xs text-gray-600">
              OR
            </span>

            <div className="h-px flex-1 bg-[#292929]" />
          </div>

          {/* EMAIL LOGIN */}
          {!showPhone && (
            <form onSubmit={handleLogin} className="space-y-4">

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none transition focus:border-blue-500"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none transition focus:border-blue-500"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Log In"}
              </button>

            </form>
          )}

          {/* PHONE LOGIN */}
          {showPhone && (
            <div className="space-y-4">

              {!otpSent ? (
                <>
                  <input
                    type="tel"
                    placeholder="+2348012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none transition focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-xl border border-[#292929] bg-[#111] p-3 text-white outline-none transition focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 p-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setMessage("");
                    }}
                    className="w-full text-sm text-gray-500 hover:text-white"
                  >
                    Use a different number
                  </button>
                </>
              )}

            </div>
          )}

          {/* PHONE / EMAIL SWITCH */}
          <button
            type="button"
            onClick={() => {
              setShowPhone(!showPhone);
              setMessage("");
              setOtpSent(false);
              setOtp("");
            }}
            className="mt-4 w-full text-sm text-blue-500 hover:underline"
          >
            {showPhone
              ? "Log in with email instead"
              : "Log in with phone number"}
          </button>

          {/* MESSAGE */}
          {message && (
            <p
              className={`mt-4 text-center text-sm ${
                message.includes("sent")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}

          {/* SIGN UP */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-blue-500 hover:underline"
            >
              Sign up
            </a>
          </p>

        </div>
      </div>
    </main>
  );
}