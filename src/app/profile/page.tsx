"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, User } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");
      setLoading(false);
    };

    getUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading profile...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft size={18} />
          Back to OLANIX
        </button>

        <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
              <User size={25} />
            </div>

            <div>
              <h1 className="text-xl font-semibold">
                Profile
              </h1>

              <p className="text-sm text-zinc-500">
                Your OLANIX account
              </p>
            </div>
          </div>

          <div className="border border-[#222] rounded-xl p-4 mb-6">
            <p className="text-xs text-zinc-500 mb-1">
              Email
            </p>

            <p className="text-sm break-all">
              {email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-3 text-sm font-medium transition"
          >
            <LogOut size={17} />
            Log Out
          </button>
        </div>
      </div>
    </main>
  );
}