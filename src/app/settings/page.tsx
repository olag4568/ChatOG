"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Moon,
  Sun,
  Bell,
  Shield,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load local theme immediately
        const savedTheme = localStorage.getItem("chatog_dark_mode");

        if (savedTheme !== null) {
          setDarkMode(savedTheme === "true");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("user_settings")
          .select("dark_mode, notifications")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("SETTINGS LOAD ERROR:", error);
          return;
        }

        if (data) {
          const theme = data.dark_mode ?? false;

          setDarkMode(theme);
          setNotifications(data.notifications ?? true);

          // Keep browser theme synchronized
          localStorage.setItem(
            "chatog_dark_mode",
            String(theme)
          );
        } else {
          await supabase.from("user_settings").insert({
            user_id: user.id,
            dark_mode: false,
            notifications: true,
          });
        }
      } catch (error) {
        console.error("SETTINGS ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [router, supabase]);

  // Save settings
  const saveSettings = async (
    newDarkMode: boolean,
    newNotifications: boolean
  ) => {
    try {
      setSaving(true);

      // Save locally immediately
      localStorage.setItem(
        "chatog_dark_mode",
        String(newDarkMode)
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            dark_mode: newDarkMode,
            notifications: newNotifications,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) {
        console.error("SETTINGS SAVE ERROR:", error);
        alert("Could not save your settings.");
      }
    } catch (error) {
      console.error("SETTINGS SAVE ERROR:", error);
      alert("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !darkMode;

    setDarkMode(newValue);

    // Change browser theme immediately
    document.documentElement.classList.toggle(
      "dark",
      newValue
    );

    await saveSettings(newValue, notifications);
  };

  const toggleNotifications = async () => {
    const newValue = !notifications;

    setNotifications(newValue);

    await saveSettings(darkMode, newValue);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2
            size={20}
            className="animate-spin"
          />
          <span>Loading settings...</span>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen transition-colors ${
        darkMode
          ? "bg-[#0b0f14] text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <div
        className={`border-b ${
          darkMode
            ? "border-gray-800"
            : "border-gray-200"
        }`}
      >
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className={`p-2 rounded-lg transition ${
                darkMode
                  ? "hover:bg-gray-800"
                  : "hover:bg-gray-200"
              }`}
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex items-center gap-3">
              <Settings size={22} />

              <h1 className="text-xl font-semibold">
                Settings
              </h1>
            </div>
          </div>

          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2
                size={16}
                className="animate-spin"
              />
              Saving...
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Appearance */}
        <section
          className={`rounded-2xl border p-6 ${
            darkMode
              ? "border-gray-800 bg-[#11161d]"
              : "border-gray-200 bg-white"
          }`}
        >
          <h2 className="text-lg font-semibold mb-1">
            Appearance
          </h2>

          <p
            className={`text-sm mb-6 ${
              darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Customize how OLANIX looks.
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon size={20} />
              ) : (
                <Sun size={20} />
              )}

              <div>
                <p className="font-medium">
                  Dark mode
                </p>

                <p
                  className={`text-sm ${
                    darkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  Use dark appearance across OLANIX.
                </p>
              </div>
            </div>

            <button
              onClick={toggleDarkMode}
              disabled={saving}
              className={`w-12 h-7 rounded-full p-1 transition ${
                darkMode
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition ${
                  darkMode
                    ? "translate-x-5"
                    : ""
                }`}
              />
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section
          className={`rounded-2xl border p-6 ${
            darkMode
              ? "border-gray-800 bg-[#11161d]"
              : "border-gray-200 bg-white"
          }`}
        >
          <h2 className="text-lg font-semibold mb-1">
            Notifications
          </h2>

          <p
            className={`text-sm mb-6 ${
              darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Control how OLANIX notifies you.
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} />

              <div>
                <p className="font-medium">
                  Notifications
                </p>

                <p
                  className={`text-sm ${
                    darkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  Receive notifications from OLANIX.
                </p>
              </div>
            </div>

            <button
              onClick={toggleNotifications}
              disabled={saving}
              className={`w-12 h-7 rounded-full p-1 transition ${
                notifications
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition ${
                  notifications
                    ? "translate-x-5"
                    : ""
                }`}
              />
            </button>
          </div>
        </section>

        {/* Privacy */}
        <section
          className={`rounded-2xl border p-6 ${
            darkMode
              ? "border-gray-800 bg-[#11161d]"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield size={20} />

            <h2 className="text-lg font-semibold">
              Privacy & Security
            </h2>
          </div>

          <p
            className={`text-sm ${
              darkMode
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            Manage your OLANIX privacy and account
            settings.
          </p>
        </section>
      </div>
    </main>
  );
}