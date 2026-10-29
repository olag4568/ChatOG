"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  Pencil,
  X,
  Check,
} from "lucide-react";

type Message = {
  id: number;
  sender: "user" | "ai";
  text: string;
  image?: string | null;
};

type Chat = {
  id: string;
  title: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
};

const supabase = createClient();

export default function HistoryPage() {
  const router = useRouter();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  // ============================================
  // LOAD CHAT HISTORY
  // ============================================

  const loadChats = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError);
        setErrorMessage(
          "Could not check your login session. Please try again."
        );
        return;
      }

      // No user
      if (!user) {
        router.replace("/login");
        return;
      }

      // Get chats belonging to this user
      const {
        data,
        error,
      } = await supabase
        .from("chats")
        .select(
          "id, title, messages, created_at, updated_at"
        )
        .eq("user_id", user.id)
        .order("updated_at", {
          ascending: false,
        });

      if (error) {
        console.error("Load history error:", error);

        setErrorMessage(
          "We could not load your chat history. Please try again."
        );

        return;
      }

      setChats((data || []) as Chat[]);
    } catch (error) {
      console.error("History page error:", error);

      setErrorMessage(
        "Something went wrong while loading your history."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // LOAD WHEN PAGE OPENS
  // ============================================

  useEffect(() => {
    let mounted = true;

    const startLoading = async () => {
      if (!mounted) return;

      await loadChats();
    };

    startLoading();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================
  // OPEN CHAT
  // ============================================

  const openChat = (id: string) => {
    /*
      Save the chat ID temporarily so the main
      OLANIX page can know which conversation
      should be opened.
    */
    sessionStorage.setItem("chatog_open_chat", id);

    router.push("/");
  };

  // ============================================
  // RENAME CHAT
  // ============================================

  const renameChat = async (id: string) => {
    const title = renameTitle.trim();
    if (!title) {
      setErrorMessage("Chat title cannot be empty.");
      return;
    }

    setSavingRename(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("chats")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, title, messages, created_at, updated_at")
        .single();

      if (error || !data) {
        console.error("Rename chat error:", error);
        setErrorMessage("Could not rename this chat. Please try again.");
        return;
      }

      setChats((previous) =>
        previous
          .map((chat) => chat.id === id ? { ...chat, title: data.title, updated_at: data.updated_at } : chat)
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      );
      setRenamingId(null);
      setRenameTitle("");
    } catch (error) {
      console.error("Rename chat error:", error);
      setErrorMessage("Something went wrong while renaming the chat.");
    } finally {
      setSavingRename(false);
    }
  };

  // ============================================
  // GO HOME
  // ============================================

  const goHome = () => {
    router.push("/");
  };

  // ============================================
  // DELETE CHAT
  // ============================================

  const deleteChat = async (id: string) => {
    setDeletingId(id);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("chats")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Delete chat error:",
          error
        );

        setErrorMessage(
          "Could not delete this chat. Please try again."
        );

        return;
      }

      // Remove from screen immediately
      setChats((prev) =>
        prev.filter((chat) => chat.id !== id)
      );
    } catch (error) {
      console.error(
        "Delete chat error:",
        error
      );

      setErrorMessage(
        "Something went wrong while deleting the chat."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredChats = chats.filter((chat) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const titleMatch = (chat.title || "Untitled Chat").toLowerCase().includes(query);
    const messageMatch = Array.isArray(chat.messages) && chat.messages.some((message) => message.text?.toLowerCase().includes(query));
    return titleMatch || messageMatch;
  });

  // ============================================
  // FORMAT DATE
  // ============================================

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "Unknown date";
    }
  };

  // ============================================
  // PAGE
  // ============================================

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ========================================
          HEADER
      ======================================== */}

      <header className="h-20 border-b border-[#1a1a1a] flex items-center px-6">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2 text-[#a1a1aa] hover:text-white transition"
        >
          <ArrowLeft size={19} />

          <span>Back to OLANIX</span>
        </button>

        <div className="ml-auto text-xl font-bold">
          OLANIX
        </div>
      </header>

      {/* ========================================
          CONTENT
      ======================================== */}

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* TITLE */}

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Chat History
            </h1>

            <p className="text-[#71717a] mt-2">
              Your previous conversations with OLANIX.
            </p>
          </div>

          {/* REFRESH BUTTON */}

          <button
            type="button"
            onClick={loadChats}
            disabled={loading}
            className="w-10 h-10 rounded-xl border border-[#222] bg-[#0b0b0b] flex items-center justify-center text-[#71717a] hover:text-white hover:border-[#333] transition disabled:opacity-50"
            title="Refresh history"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>

        <div className="mb-6 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search conversations and messages..."
            aria-label="Search chat history"
            className="w-full rounded-xl border border-[#27272a] bg-[#090909] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-[#52525b] focus:border-blue-500"
          />
        </div>

        {/* ========================================
            ERROR
        ======================================== */}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-900/40 bg-red-950/20 p-4">
            <p className="text-sm text-red-400">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={loadChats}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* ========================================
            LOADING
        ======================================== */}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2
              size={30}
              className="animate-spin text-blue-500"
            />

            <p className="text-sm text-[#71717a] mt-4">
              Loading your chats...
            </p>
          </div>
        )}

        {/* ========================================
            EMPTY
        ======================================== */}

        {!loading &&
          !errorMessage &&
          chats.length === 0 && (
            <div className="border border-[#1f1f1f] rounded-2xl p-10 text-center">
              <MessageSquare
                size={40}
                className="mx-auto text-[#52525b] mb-4"
              />

              <h2 className="text-lg font-semibold">
                No chats yet
              </h2>

              <p className="text-sm text-[#71717a] mt-2">
                Start a conversation with OLANIX
                and it will appear here.
              </p>

              <button
                type="button"
                onClick={goHome}
                className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
              >
                Start a Chat
              </button>
            </div>
          )}

        {/* ========================================
            CHAT LIST
        ======================================== */}

        {!loading &&
          filteredChats.length > 0 && (
            <div className="space-y-3">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className="group border border-[#1f1f1f] bg-[#080808] rounded-2xl p-5 hover:border-[#333333] transition"
                >
                  <div className="flex items-start gap-4">
                    {/* CHAT BUTTON */}

                    <button
                      type="button"
                      onClick={() =>
                        openChat(chat.id)
                      }
                      className="flex flex-1 items-start gap-4 text-left min-w-0 cursor-pointer"
                    >
                      {/* ICON */}

                      <div className="w-11 h-11 shrink-0 rounded-xl bg-[#111111] flex items-center justify-center">
                        <MessageSquare
                          size={20}
                          className="text-blue-500"
                        />
                      </div>

                      {/* CHAT INFO */}

                      <div className="flex-1 min-w-0">
                        {renamingId === chat.id ? (
                          <form
                            className="flex items-center gap-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void renameChat(chat.id);
                            }}
                          >
                            <input
                              autoFocus
                              value={renameTitle}
                              onChange={(event) => setRenameTitle(event.target.value)}
                              maxLength={80}
                              aria-label="New chat title"
                              className="min-w-0 flex-1 rounded-lg border border-[#333] bg-black px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            />
                            <button type="submit" disabled={savingRename} aria-label="Save chat title" className="rounded-lg p-2 text-emerald-400 hover:bg-[#171717] disabled:opacity-50">
                              <Check size={16} />
                            </button>
                            <button type="button" onClick={() => { setRenamingId(null); setRenameTitle(""); }} aria-label="Cancel rename" className="rounded-lg p-2 text-[#a1a1aa] hover:bg-[#171717]">
                              <X size={16} />
                            </button>
                          </form>
                        ) : (
                          <h2 className="font-semibold truncate">
                            {chat.title || "Untitled Chat"}
                          </h2>
                        )}

                        <p className="text-xs text-[#52525b] mt-1">
                          {formatDate(
                            chat.updated_at
                          )}
                        </p>

                        <p className="text-sm text-[#71717a] mt-3">
                          {Array.isArray(
                            chat.messages
                          )
                            ? `${chat.messages.length} message${
                                chat.messages
                                  .length === 1
                                  ? ""
                                  : "s"
                              }`
                            : "0 messages"}
                        </p>
                      </div>
                    </button>

                    {/* RENAME + DELETE BUTTONS */}

                    <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(chat.id);
                        setRenameTitle(chat.title || "");
                        setErrorMessage("");
                      }}
                      disabled={renamingId === chat.id}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[#52525b] hover:text-blue-400 hover:bg-[#151515] transition disabled:opacity-50"
                      aria-label="Rename chat"
                      title="Rename chat"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        deleteChat(chat.id)
                      }
                      disabled={
                        deletingId === chat.id
                      }
                      className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-[#52525b] hover:text-red-400 hover:bg-[#151515] transition disabled:opacity-50"
                      aria-label="Delete chat"
                    >
                      {deletingId === chat.id ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        {!loading && !errorMessage && chats.length > 0 && filteredChats.length === 0 && (
          <div className="rounded-2xl border border-[#1f1f1f] p-10 text-center">
            <Search size={30} className="mx-auto mb-3 text-[#52525b]" />
            <h2 className="font-semibold">No matching conversations</h2>
            <p className="mt-2 text-sm text-[#71717a]">Try a different title or keyword.</p>
          </div>
        )}
      </main>
    </div>
  );
}