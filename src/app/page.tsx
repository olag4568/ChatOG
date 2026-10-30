"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";

import {
  Menu,
  MessageSquarePlus,
  History,
  Compass,
  Image as ImageIcon,
  Send,
  User,
  Sun,
  Moon,
  Sparkles,
  MapPin,
  X,
  RefreshCw,
  Trash2,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  Plug,
  Code2,
  LibraryBig,
  Clock3,
  Folder,
  Plus,
  Search,
  Paperclip,
  ImagePlus,
  Globe,
  FlaskConical,
  Pencil,
  Copy,
  Check,
  Brain,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Share2,
  ExternalLink,
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
  updated_at: string;
  messages?: Message[];
};

type GuestChat = Chat & {
  messages: Message[];
};

const GUEST_CHATS_KEY = "olanix_guest_chats";

function readGuestChats(): GuestChat[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(GUEST_CHATS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((chat): chat is GuestChat =>
      Boolean(
        chat &&
        typeof chat === "object" &&
        typeof chat.id === "string" &&
        chat.id.startsWith("guest-") &&
        typeof chat.title === "string" &&
        typeof chat.updated_at === "string" &&
        Array.isArray(chat.messages)
      )
    );
  } catch {
    return [];
  }
}

function writeGuestChats(chats: GuestChat[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_CHATS_KEY, JSON.stringify(chats));
}

type LocationStatus =
  | "unknown"
  | "requesting"
  | "granted"
  | "denied";

type AccountRole = "free" | "pro" | "owner";

type ChatApiResponse = {
  reply?: string;
  message?: string;
  error?: string;

  account?: {
    role?: AccountRole;
    memoryAccess?: boolean;
    memoryEnabled?: boolean;
  };

  memory?: {
    enabled?: boolean;
    saved?: boolean;
    savedText?: string | null;
  };
};

const supabase = createClient();

export default function OLANIX() {
  const router = useRouter();

  // =====================================================
  // BASIC CHAT STATE
  // =====================================================

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renamingChatTitle, setRenamingChatTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<number, "like" | "dislike">>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // =====================================================
  // THEME
  // =====================================================

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // =====================================================
  // PROFILE + SETTINGS
  // =====================================================

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // =====================================================
  // MEMORY
  // =====================================================

  const [memoryEnabled, setMemoryEnabled] = useState(true);

  const [accountRole, setAccountRole] =
    useState<AccountRole>("free");

  // All account types can use memory during the initial build.
  const memoryAccess = true;

  const GUEST_MEMORY_KEY = "olanix_guest_memory";

  function readGuestMemory(): string[] {
    try {
      const stored = window.localStorage.getItem(GUEST_MEMORY_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string").slice(0, 20)
        : [];
    } catch {
      return [];
    }
  }

  function writeGuestMemory(items: string[]) {
    try {
      window.localStorage.setItem(GUEST_MEMORY_KEY, JSON.stringify(items.slice(0, 20)));
    } catch (error) {
      console.warn("Could not save guest memory locally.", error);
    }
  }

  // =====================================================
  // IMAGE
  // =====================================================

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [viewingImage, setViewingImage] =
    useState<string | null>(null);

  // =====================================================
  // LOCATION
  // =====================================================

  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("unknown");

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // =====================================================
  // REFS
  // =====================================================

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const chatRequestRef =
    useRef(0);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfileMenu) return;

    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !profileMenuRef.current?.contains(target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (!showPlusMenu) return;

    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !plusMenuRef.current?.contains(target)
      ) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [showPlusMenu]);

  // =====================================================
  // REMOVE IMAGE
  // =====================================================

  const removeSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // =====================================================
  // LOAD MEMORY + ACCOUNT ROLE
  // =====================================================

  const loadMemorySetting = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsAuthenticated(false);
        setAccountRole("free");
        setMemoryEnabled(true);
        return;
      }

      setIsAuthenticated(true);

      const { data, error } = await supabase
        .from("user_settings")
        .select("role, memory_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn(
          "LOAD MEMORY SETTING ERROR:",
          error
        );

        setAccountRole("free");
        setMemoryEnabled(true);

        return;
      }

      // =================================================
      // GET ACCOUNT ROLE
      // =================================================

      const role: AccountRole =
        data?.role === "owner" ||
        data?.role === "pro" ||
        data?.role === "free"
          ? data.role
          : "free";

      setAccountRole(role);

      // =================================================
      // FREE USERS
      // =================================================

      // Memory stays enabled for Free, Pro, and Owner accounts during development.

      // =================================================
      // PRO / OWNER
      // =================================================

      if (
        data?.memory_enabled !== null &&
        data?.memory_enabled !== undefined
      ) {
        setMemoryEnabled(
          Boolean(data.memory_enabled)
        );
      } else {
        setMemoryEnabled(true);
      }
    } catch (error) {
      console.warn(
        "LOAD MEMORY ERROR:",
        error
      );

      setAccountRole("free");
      setMemoryEnabled(false);
    }
  };

  // =====================================================
  // THEME — LOAD
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const loadTheme = async () => {
      try {
        const savedTheme =
          localStorage.getItem(
            "chatog-theme"
          );

        if (!cancelled) {
          if (savedTheme === "light") {
            setIsDarkMode(false);
          } else {
            setIsDarkMode(true);

            if (savedTheme !== "dark") {
              localStorage.setItem(
                "chatog-theme",
                "dark"
              );
            }
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          setThemeLoaded(true);
          return;
        }

        const { data, error } =
          await supabase
            .from("user_settings")
            .select("dark_mode")
            .eq("user_id", user.id)
            .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn(
            "THEME LOAD ERROR:",
            error
          );

          setThemeLoaded(true);
          return;
        }

        if (data) {
          const darkMode =
            data.dark_mode ?? true;

          setIsDarkMode(darkMode);

          localStorage.setItem(
            "chatog-theme",
            darkMode
              ? "dark"
              : "light"
          );

          setThemeLoaded(true);
          return;
        }

        const { error: insertError } =
          await supabase
            .from("user_settings")
            .insert({
              user_id: user.id,
              dark_mode: true,
              notifications: true,
              memory_enabled: true,
            });

        if (insertError) {
          console.warn(
            "DEFAULT SETTINGS ERROR:",
            insertError
          );
        }

        if (!cancelled) {
          setThemeLoaded(true);
        }
      } catch (error) {
        console.warn(
          "THEME ERROR:",
          error
        );

        if (!cancelled) {
          setThemeLoaded(true);
        }
      }
    };

    loadTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // THEME — SYNC
  // =====================================================

  useEffect(() => {
    const handleThemeChange = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          darkMode?: boolean;
        }>;

      const darkMode =
        customEvent.detail?.darkMode;

      if (
        typeof darkMode !==
        "boolean"
      ) {
        return;
      }

      setIsDarkMode(darkMode);

      localStorage.setItem(
        "chatog-theme",
        darkMode
          ? "dark"
          : "light"
      );
    };

    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key !==
        "chatog-theme"
      ) {
        return;
      }

      setIsDarkMode(
        event.newValue !== "light"
      );
    };

    window.addEventListener(
      "chatog-theme-change",
      handleThemeChange
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "chatog-theme-change",
        handleThemeChange
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  // =====================================================
  // TOGGLE THEME
  // =====================================================

  const toggleTheme = async () => {
    const newTheme =
      !isDarkMode;

    setIsDarkMode(newTheme);

    localStorage.setItem(
      "chatog-theme",
      newTheme
        ? "dark"
        : "light"
    );

    window.dispatchEvent(
      new CustomEvent(
        "chatog-theme-change",
        {
          detail: {
            darkMode: newTheme,
          },
        }
      )
    );

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return;
      }

      const {
        data: existingSettings,
        error: settingsError,
      } =
        await supabase
          .from("user_settings")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (settingsError) {
        console.warn(
          "THEME SETTINGS CHECK ERROR:",
          settingsError
        );
        return;
      }

      if (existingSettings) {
        const { error } =
          await supabase
            .from("user_settings")
            .update({
              dark_mode: newTheme,
            })
            .eq(
              "user_id",
              user.id
            );

        if (error) {
          console.warn(
            "THEME UPDATE ERROR:",
            error
          );
        }
      } else {
        const { error } =
          await supabase
            .from("user_settings")
            .insert({
              user_id: user.id,
              dark_mode: newTheme,
              notifications: true,
              memory_enabled: true,
            });

        if (error) {
          console.warn(
            "THEME INSERT ERROR:",
            error
          );
        }
      }
    } catch (error) {
      console.warn(
        "THEME SAVE ERROR:",
        error
      );
    }
  };

  // =====================================================
  // LOAD CHAT HISTORY
  // =====================================================

  const loadRecentChats = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setRecentChats(
          readGuestChats()
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .map(({ id, title, updated_at }) => ({ id, title, updated_at }))
        );
        return;
      }

      const { data, error } =
        await supabase
          .from("chats")
          .select(
            "id, title, updated_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "updated_at",
            {
              ascending: false,
            }
          );

      if (error) {
        console.error(
          "LOAD CHAT HISTORY ERROR:",
          error
        );
        return;
      }

      setRecentChats(
        (data || []) as Chat[]
      );
    } catch (error) {
      console.error(
        "CHAT HISTORY ERROR:",
        error
      );
    }
  };

  // =====================================================
  // OPEN CHAT
  // =====================================================

  const openChat = async (
    id: string
  ) => {
    if (id === chatId) {
      return;
    }

    const requestId =
      ++chatRequestRef.current;

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (id.startsWith("guest-")) {
        const guestChat = readGuestChats().find((chat) => chat.id === id);
        if (!guestChat) {
          alert("Could not open this guest conversation.");
          return;
        }

        setChatId(id);
        setMessages(guestChat.messages);
        setInputMessage("");
        removeSelectedImage();
        window.history.replaceState({}, "", `/?chat=${id}`);
        return;
      }

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } =
        await supabase
          .from("chats")
          .select(
            "id, messages"
          )
          .eq("id", id)
          .eq(
            "user_id",
            user.id
          )
          .single();

      if (
        requestId !==
        chatRequestRef.current
      ) {
        return;
      }

      if (error || !data) {
        console.error(
          "OPEN CHAT ERROR:",
          error
        );

        alert(
          "Could not open this chat."
        );

        return;
      }

      const savedMessages =
        Array.isArray(
          data.messages
        )
          ? data.messages
          : [];

      setChatId(data.id);

      setMessages(
        savedMessages as Message[]
      );

      setInputMessage("");

      removeSelectedImage();

      if (textareaRef.current) {
        textareaRef.current.style.height =
          "auto";
      }

      window.history.replaceState(
        {},
        "",
        `/?chat=${id}`
      );
    } catch (error) {
      console.error(
        "OPEN CHAT ERROR:",
        error
      );
    } finally {
      if (
        requestId ===
        chatRequestRef.current
      ) {
        setLoading(false);
      }
    }
  };

  // =====================================================
  // RENAME CHAT
  // =====================================================

  const renameChat = async (id: string) => {
    const title = renamingChatTitle.trim();
    if (!title) {
      alert("Chat title cannot be empty.");
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (id.startsWith("guest-")) {
        const guestChats = readGuestChats();
        const index = guestChats.findIndex((chat) => chat.id === id);
        if (index < 0) {
          alert("Could not find this guest conversation.");
          return;
        }
        guestChats[index] = { ...guestChats[index], title, updated_at: new Date().toISOString() };
        writeGuestChats(guestChats);
      } else {
        if (userError || !user) {
          router.push("/login");
          return;
        }
        const { error } = await supabase
          .from("chats")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      }

      setRenamingChatId(null);
      setRenamingChatTitle("");
      await loadRecentChats();
    } catch (error) {
      console.error("RENAME CHAT ERROR:", error);
      alert("Could not rename this conversation. Please try again.");
    }
  };

  // =====================================================
  // DELETE CHAT
  // =====================================================

  const deleteChat = async (
    id: string
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this conversation?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (id.startsWith("guest-")) {
        writeGuestChats(readGuestChats().filter((chat) => chat.id !== id));
      } else {
        if (userError || !user) {
          router.push("/login");
          return;
        }

        const { error } =
          await supabase
            .from("chats")
            .delete()
            .eq("id", id)
            .eq(
              "user_id",
              user.id
            );

        if (error) {
          console.error(
            "DELETE CHAT ERROR:",
            error
          );

          alert(
            "Could not delete this conversation."
          );

          return;
        }
      }

      if (id === chatId) {
        ++chatRequestRef.current;

        setMessages([]);
        setChatId(null);
        setInputMessage("");
        setLoading(false);

        removeSelectedImage();

        if (textareaRef.current) {
          textareaRef.current.style.height =
            "auto";
        }

        window.history.replaceState(
          {},
          "",
          "/"
        );
      }

      await loadRecentChats();
    } catch (error) {
      console.error(
        "DELETE CHAT ERROR:",
        error
      );

      alert(
        "Something went wrong while deleting the chat."
      );
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const startPage = async () => {
      try {
        // =================================================
        // IMPORTANT:
        // Load role + memory BEFORE the UI is used.
        // =================================================

        await loadMemorySetting();

        if (cancelled) {
          return;
        }

        const savedChatId =
          sessionStorage.getItem(
            "chatog_open_chat"
          );

        if (savedChatId) {
          sessionStorage.removeItem(
            "chatog_open_chat"
          );

          await openChat(
            savedChatId
          );
        } else {
          if (!cancelled) {
            setMessages([]);
            setChatId(null);
            setInputMessage("");

            window.history.replaceState(
              {},
              "",
              "/"
            );
          }
        }

        await loadRecentChats();
      } catch (error) {
        console.error(
          "INITIAL PAGE ERROR:",
          error
        );
      }
    };

    startPage();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // ESCAPE KEY
  // =====================================================

  useEffect(() => {
    const handleEscape = (
      e: KeyboardEvent
    ) => {
      if (e.key === "Escape") {
        setViewingImage(null);
        setShowProfileMenu(false);
        setShowSettings(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // =====================================================
  // LOCATION
  // =====================================================

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }

    setLocationStatus(
      "requesting"
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude:
            position.coords
              .latitude,
          longitude:
            position.coords
              .longitude,
        });

        setLocationStatus(
          "granted"
        );
      },
      (error) => {
        console.warn(
          "LOCATION ERROR:",
          error.message
        );

        setLocationStatus(
          "denied"
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    requestLocation();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages, loading]);

  // =====================================================
  // TEXTAREA RESIZE
  // =====================================================

  const resizeTextarea = () => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180
    )}px`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInputMessage(
      e.target.value
    );

    requestAnimationFrame(() => {
      resizeTextarea();
    });
  };

  // =====================================================
  // IMAGE SELECT
  // =====================================================

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      alert(
        "Please select an image file."
      );

      e.target.value = "";
      return;
    }

    if (
      file.size >
      20 * 1024 * 1024
    ) {
      alert(
        "Image must be smaller than 20MB."
      );

      e.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedImage(file);
    setImagePreview(
      previewUrl
    );
  };

  // =====================================================
  // IMAGE TO BASE64
  // =====================================================

  const convertImageToBase64 = (
    file: File
  ): Promise<string> => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          if (
            typeof reader.result ===
            "string"
          ) {
            resolve(
              reader.result
            );
          } else {
            reject(
              new Error(
                "Could not read image."
              )
            );
          }
        };

        reader.onerror = () => {
          reject(
            new Error(
              "Could not read image."
            )
          );
        };

        reader.readAsDataURL(
          file
        );
      }
    );
  };

  // =====================================================
  // CREATE CHAT
  // =====================================================

  const createChat = async (
    firstMessage: string
  ): Promise<string> => {
    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    const chatTitle =
      firstMessage.trim()
        ? firstMessage
            .trim()
            .slice(0, 50)
        : "Image Chat";

    if (userError || !user) {
      const id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const guestChats = readGuestChats();
      guestChats.unshift({
        id,
        title: chatTitle,
        updated_at: new Date().toISOString(),
        messages: [],
      });
      writeGuestChats(guestChats);
      setChatId(id);
      await loadRecentChats();
      return id;
    }

    const { data, error } =
      await supabase
        .from("chats")
        .insert({
          user_id: user.id,
          title: chatTitle,
          messages: [],
        })
        .select(
          "id, title, updated_at"
        )
        .single();

    if (error || !data) {
      console.error(
        "CREATE CHAT ERROR:",
        error
      );

      throw new Error(
        error?.message ||
          "Could not create chat history."
      );
    }

    setChatId(data.id);

    await loadRecentChats();

    return data.id;
  };

  // =====================================================
  // SAVE CHAT
  // =====================================================

  const saveChatMessages = async (
    currentChatId: string,
    chatMessages: Message[]
  ) => {
    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user || currentChatId.startsWith("guest-")) {
      const guestChats = readGuestChats();
      const existingIndex = guestChats.findIndex((chat) => chat.id === currentChatId);
      if (existingIndex === -1) {
        throw new Error("Could not find this guest conversation in this browser.");
      }

      guestChats[existingIndex] = {
        ...guestChats[existingIndex],
        messages: chatMessages,
        updated_at: new Date().toISOString(),
      };
      guestChats.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      writeGuestChats(guestChats);
      await loadRecentChats();
      return;
    }

    const { data, error } =
      await supabase
        .from("chats")
        .update({
          messages:
            chatMessages,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          currentChatId
        )
        .eq(
          "user_id",
          user.id
        )
        .select("id")
        .single();

    if (error || !data) {
      console.error(
        "SAVE CHAT ERROR:",
        error
      );

      throw new Error(
        error?.message ||
          "Could not save chat history."
      );
    }

    await loadRecentChats();
  };

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const handleSendMessage =
    async () => {
      const textToSend =
        inputMessage.trim();

      if (
        (!textToSend &&
          !selectedImage) ||
        loading
      ) {
        return;
      }

      const imageToSend =
        selectedImage;

      let imageBase64:
        | string
        | null = null;

      try {
        if (imageToSend) {
          imageBase64 =
            await convertImageToBase64(
              imageToSend
            );
        }
      } catch (error) {
        console.error(
          "IMAGE CONVERSION ERROR:",
          error
        );

        alert(
          "Could not prepare the image."
        );

        return;
      }

      const userMessage: Message = {
        id: Date.now(),
        sender: "user",
        text: textToSend,
        image: imageBase64,
      };

      const currentMessages = [
        ...messages,
        userMessage,
      ];

      setMessages(
        currentMessages
      );

      setInputMessage("");

      removeSelectedImage();

      if (textareaRef.current) {
        textareaRef.current.style.height =
          "auto";
      }

      setLoading(true);

      let chatToSave:
        | string
        | null = chatId;

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        const canSaveChat = !authError && Boolean(user);
        setIsAuthenticated(canSaveChat);

        if (!chatToSave) {
          chatToSave = await createChat(
            textToSend || "Image Chat"
          );

          window.history.replaceState(
            {},
            "",
            `/?chat=${chatToSave}`
          );
        }

        if (!chatToSave) {
          throw new Error("Chat ID was not created.");
        }

        await saveChatMessages(chatToSave, currentMessages);

        const timezone =
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;

        const response =
          await fetch(
            "/api/chat",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                message:
                  textToSend,

                image:
                  imageBase64,

                location:
                  userLocation,

                timezone,

                currentDate:
                  new Date().toISOString(),

                memoryEnabled,
                guestMemories: readGuestMemory(),
                history: currentMessages
                  .slice(0, -1)
                  .filter(
                    (item) =>
                      (item.sender === "user" || item.sender === "ai") &&
                      typeof item.text === "string" &&
                      item.text.trim().length > 0
                  )
                  .slice(-12)
                  .map((item) => ({
                    role: item.sender === "ai" ? "assistant" : "user",
                    content: item.text.slice(0, 6000),
                  })),
              }),
            }
          );

        let data: ChatApiResponse;

        try {
          data =
            await response.json();
        } catch {
          throw new Error(
            "OLANIX returned an invalid response."
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Something went wrong."
          );
        }

        // =================================================
        // SYNC ACCOUNT ROLE FROM API
        // =================================================

        if (
          data.account?.role ===
            "owner" ||
          data.account?.role ===
            "pro" ||
          data.account?.role ===
            "free"
        ) {
          setAccountRole(
            data.account.role
          );
        }

        // Memory is always enabled; no user-facing switch is provided.
        setMemoryEnabled(true);

        if (data.memory?.savedText && !canSaveChat) {
          const existingGuestMemory = readGuestMemory();
          if (!existingGuestMemory.includes(data.memory.savedText)) {
            writeGuestMemory([data.memory.savedText, ...existingGuestMemory]);
          }
        }

        const aiMessage: Message = {
          id: Date.now() + 1,
          sender: "ai",
          text:
            data?.reply ||
            data?.message ||
            "I couldn't generate a response.",
        };

        const finalMessages = [
          ...currentMessages,
          aiMessage,
        ];

        setMessages(
          finalMessages
        );

        if (chatToSave) {
          await saveChatMessages(
            chatToSave,
            finalMessages
          );
        }
      } catch (error) {
        console.error(
          "CHAT ERROR:",
          error
        );

        const errorText =
          error instanceof Error
            ? error.message
            : "Something went wrong while connecting to OLANIX.";

        const errorMessage: Message = {
          id: Date.now() + 1,
          sender: "ai",
          text: errorText,
        };

        const messagesWithError = [
          ...currentMessages,
          errorMessage,
        ];

        setMessages(
          messagesWithError
        );

        if (chatToSave) {
          try {
            await saveChatMessages(
              chatToSave,
              messagesWithError
            );
          } catch (saveError) {
            console.error(
              "ERROR SAVING ERROR MESSAGE:",
              saveError
            );
          }
        }
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // AI RESPONSE ACTIONS
  // =====================================================

  const shareText = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "OLANIX response", text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Share is not available here. Reply copied so you can share it.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("SHARE ERROR:", error);
      }
    }
  };

  const readAloud = (text: string) => {
    if (!("speechSynthesis" in window)) {
      alert("Read aloud is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const retryResponse = async (messageId: number) => {
    if (loading) return;
    const targetIndex = messages.findIndex((item) => item.id === messageId && item.sender === "ai");
    if (targetIndex < 1) return;
    const previousUser = [...messages.slice(0, targetIndex)].reverse().find((item) => item.sender === "user");
    if (!previousUser) return;

    const history = messages.slice(0, targetIndex);
    const updatedMessages = messages.slice(0, targetIndex + 1);
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: previousUser.text,
          image: previousUser.image || null,
          location: userLocation,
          timezone,
          currentDate: new Date().toISOString(),
          memoryEnabled,
          guestMemories: readGuestMemory(),
          history: history.slice(0, -1)
            .filter((item) => (item.sender === "user" || item.sender === "ai") && item.text.trim())
            .slice(-12)
            .map((item) => ({ role: item.sender === "ai" ? "assistant" : "user", content: item.text.slice(0, 6000) })),
        }),
      });
      const data: ChatApiResponse = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not regenerate this response.");
      const replacement: Message = { id: Date.now(), sender: "ai", text: data.reply || data.message || "I couldn't generate a response." };
      const finalMessages = [...history, replacement];
      setMessages(finalMessages);
      if (chatId) await saveChatMessages(chatId, finalMessages);
    } catch (error) {
      console.error("RETRY ERROR:", error);
      alert(error instanceof Error ? error.message : "Could not regenerate this response.");
      setMessages(history);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // KEYBOARD
  // =====================================================

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      if (!loading) {
        handleSendMessage();
      }
    }
  };

  // =====================================================
  // NEW CHAT
  // =====================================================

  const handleNewChat = () => {
    ++chatRequestRef.current;

    setMessages([]);
    setChatId(null);
    setInputMessage("");
    setLoading(false);

    removeSelectedImage();

    if (textareaRef.current) {
      textareaRef.current.style.height =
        "auto";
    }

    window.history.replaceState(
      {},
      "",
      "/"
    );

    loadRecentChats();
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "LOGOUT ERROR:",
          error
        );

        alert(
          "Could not log out. Please try again."
        );

        return;
      }

      setShowProfileMenu(false);

      router.push("/login");
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      alert(
        "Something went wrong while logging out."
      );
    }
  };

  // =====================================================
  // MENU
  // =====================================================

  const menuItems = [
    {
      name: "New Chat",
      icon: MessageSquarePlus,
      action: "new-chat",
    },
    {
      name: "Images",
      icon: ImageIcon,
      action: "images",
    },
    {
      name: "Scheduled",
      icon: Clock3,
      action: "scheduled",
    },
    {
      name: "Plugins",
      icon: Plug,
      action: "plugins",
    },
    {
      name: "Codex",
      icon: Code2,
      action: "codex",
    },
    {
      name: "Library",
      icon: LibraryBig,
      action: "library",
    },
    {
      name: "Explore",
      icon: Compass,
      action: "explore",
    },
  ];

  // =====================================================
  // THEME LOADING SCREEN
  // =====================================================

  if (!themeLoaded) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center">
            <Sparkles
              size={20}
              className="text-blue-500 animate-pulse"
            />
          </div>

          <p className="text-sm text-[#71717a]">
            Loading OLANIX...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className={`h-dvh w-full flex overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-black text-white"
          : "bg-white text-black"
      }`}
    >
      {/* Mobile sidebar backdrop */}
      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* =================================================
          LEFT SIDEBAR
          ================================================= */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] shrink-0 border-r flex flex-col transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isDarkMode
            ? "bg-black border-[#1a1a1a]"
            : "bg-white border-[#e5e5e5]"
        }`}
      >
        {/* LOGO */}

        <div
          className={`h-16 shrink-0 flex items-center justify-between px-4 border-b ${
            isDarkMode
              ? "border-[#1a1a1a]"
              : "border-[#e5e5e5]"
          }`}
        >
          <div className="text-xl font-bold tracking-tight">OLANIX</div>

          <button
            type="button"
            aria-label="Search chats"
            onClick={() => setActiveFeature("Search")}
            className={`mr-2 w-9 h-9 flex items-center justify-center rounded-lg transition ${isDarkMode ? "hover:bg-[#111111]" : "hover:bg-[#f3f3f3]"}`}
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
              isDarkMode
                ? "hover:bg-[#111111]"
                : "hover:bg-[#f3f3f3]"
            }`}
          >
            {isDarkMode ? (
              <Moon
                size={18}
                className="text-white"
              />
            ) : (
              <Sun
                size={18}
                className="text-black"
              />
            )}
          </button>
        </div>

        {/* MENU */}

        <nav className="shrink-0 px-3 py-2 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setIsMobileSidebarOpen(false);

                  if (item.action === "new-chat") {
                    handleNewChat();
                  } else if (item.action === "images") {
                    imageInputRef.current?.click();
                  } else {
                    setActiveFeature(item.name);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isDarkMode
                    ? "text-[#a1a1aa] hover:bg-[#111111] hover:text-white"
                    : "text-[#525252] hover:bg-[#f3f3f3] hover:text-black"
                }`}
              >
                <Icon size={19} />

                <span>
                  {item.name}
                </span>
              </button>
            );
          })}
        </nav>

        {/* CHAT HISTORY */}

        <div className={`flex-1 min-h-0 flex flex-col border-t ${
          isDarkMode ? "border-[#1a1a1a]" : "border-[#e5e5e5]"
        }`}>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2 min-w-0">
              <History size={17} className="shrink-0 text-blue-500" />
              <span className="text-sm font-semibold">Recents</span>
            </div>
            <button
              type="button"
              onClick={loadRecentChats}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                isDarkMode
                  ? "text-[#a1a1aa] hover:bg-[#151515] hover:text-white"
                  : "text-[#737373] hover:bg-[#f3f3f3] hover:text-black"
              }`}
              aria-label="Reload history"
              title="Reload history"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="px-3 pb-2">
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDarkMode ? "border-[#222] bg-[#0b0b0b] text-[#737373]" : "border-[#e5e5e5] bg-white text-[#737373]"}`}>
              <Search size={14} />
              <input
                value={chatSearchQuery}
                onChange={(event) => setChatSearchQuery(event.target.value)}
                placeholder="Search chats..."
                aria-label="Search chats"
                className={`w-full min-w-0 bg-transparent text-xs outline-none ${isDarkMode ? "text-white placeholder:text-[#52525b]" : "text-black placeholder:text-[#a3a3a3]"}`}
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
            {recentChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-2 py-6 text-center">
                <History size={21} className={`mb-2 ${
                  isDarkMode ? "text-[#52525b]" : "text-[#a3a3a3]"
                }`} />
                <p className="text-xs font-medium">
                  {isAuthenticated ? "No chat history" : "No guest history yet"}
                </p>
                <p className={`mt-1 text-[11px] leading-5 ${
                  isDarkMode ? "text-[#52525b]" : "text-[#a3a3a3]"
                }`}>
                  {isAuthenticated
                    ? "Your conversations will appear here."
                    : "Guest conversations are saved in this browser."}
                </p>
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-blue-500"
                  >
                    Log in / Sign up
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {recentChats.filter((chat) => (chat.title || "Untitled chat").toLowerCase().includes(chatSearchQuery.trim().toLowerCase())).map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex min-w-0 items-center gap-1 rounded-xl transition ${
                      chat.id === chatId
                        ? isDarkMode ? "bg-[#151515]" : "bg-[#f3f3f3]"
                        : isDarkMode ? "hover:bg-[#111111]" : "hover:bg-[#f3f3f3]"
                    }`}
                  >
                    {renamingChatId === chat.id ? (
                      <form
                        className="flex min-w-0 flex-1 items-center gap-1 px-2 py-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void renameChat(chat.id);
                        }}
                      >
                        <input
                          autoFocus
                          value={renamingChatTitle}
                          onChange={(event) => setRenamingChatTitle(event.target.value)}
                          maxLength={80}
                          aria-label="Rename conversation"
                          className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs outline-none ${isDarkMode ? "border-[#333] bg-black text-white" : "border-[#ddd] bg-white text-black"}`}
                        />
                        <button type="submit" className="text-emerald-500" aria-label="Save title"><Check size={14} /></button>
                        <button type="button" onClick={() => { setRenamingChatId(null); setRenamingChatTitle(""); }} className="text-[#888]" aria-label="Cancel rename"><X size={14} /></button>
                      </form>
                    ) : (
                    <>
                    <button
                      type="button"
                      onClick={() => openChat(chat.id)}
                      className={`flex-1 min-w-0 rounded-xl px-3 py-3 text-left text-xs transition ${
                        isDarkMode
                          ? "text-[#a1a1aa] hover:text-white"
                          : "text-[#525252] hover:text-black"
                      }`}
                      title={chat.title || "Untitled chat"}
                    >
                      <span className="block truncate">
                        {chat.title || "Untitled chat"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setRenamingChatId(chat.id);
                        setRenamingChatTitle(chat.title || "");
                      }}
                      className={`mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${isDarkMode ? "text-[#71717a] hover:bg-[#252525] hover:text-blue-400" : "text-[#737373] hover:bg-[#e5e5e5] hover:text-blue-600"}`}
                      aria-label="Rename chat"
                      title="Rename chat"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className={`mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 ${
                        isDarkMode
                          ? "text-[#71717a] hover:bg-red-950 hover:text-red-400"
                          : "text-[#737373] hover:bg-red-50 hover:text-red-600"
                      }`}
                      aria-label="Delete chat"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                    </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PROFILE */}

        <div
          ref={profileMenuRef}
          className={`relative p-4 border-t ${
            isDarkMode
              ? "border-[#1a1a1a]"
              : "border-[#e5e5e5]"
          }`}
        >
          {showProfileMenu && (
            <div
              className={`absolute bottom-[88px] left-4 right-4 z-50 overflow-hidden rounded-2xl border shadow-2xl ${
                isDarkMode
                  ? "bg-[#0d0d0d] border-[#292929]"
                  : "bg-white border-[#e5e5e5]"
              }`}
            >
              {/* PROFILE */}

              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(
                    false
                  );

                  router.push(
                    isAuthenticated ? "/profile" : "/login"
                  );
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition ${
                  isDarkMode
                    ? "text-[#d4d4d8] hover:bg-[#151515] hover:text-white"
                    : "text-[#404040] hover:bg-[#f5f5f5] hover:text-black"
                }`}
              >
                <User size={18} />

                <span>
                  {isAuthenticated ? "Profile" : "Log in / Sign up"}
                </span>
              </button>

              {/* SETTINGS */}

              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(
                    false
                  );

                  setShowSettings(
                    true
                  );
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition ${
                  isDarkMode
                    ? "text-[#d4d4d8] hover:bg-[#151515] hover:text-white"
                    : "text-[#404040] hover:bg-[#f5f5f5] hover:text-black"
                }`}
              >
                <Settings size={18} />

                <span>
                  Settings
                </span>
              </button>

              <div
                className={`h-px ${
                  isDarkMode
                    ? "bg-[#252525]"
                    : "bg-[#e5e5e5]"
                }`}
              />

              {isAuthenticated ? (
                <>
                  {/* LOGOUT */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition ${
                      isDarkMode
                        ? "text-red-400 hover:bg-red-950/30"
                        : "text-red-600 hover:bg-red-50"
                    }`}
                  >
                    <LogOut size={18} />
                    <span>Log out</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    router.push("/login");
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition ${
                    isDarkMode
                      ? "text-blue-400 hover:bg-[#151515]"
                      : "text-blue-600 hover:bg-[#f5f5f5]"
                  }`}
                >
                  <User size={18} />
                  <span>Log in / Sign up</span>
                </button>
              )}
            </div>
          )}

          {/* PROFILE BUTTON */}

          <button
            type="button"
            onClick={() =>
              setShowProfileMenu(
                (prev) => !prev
              )
            }
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
              isDarkMode
                ? "text-[#a1a1aa] hover:bg-[#111111] hover:text-white"
                : "text-[#525252] hover:bg-[#f3f3f3] hover:text-black"
            }`}
          >
            <div
              className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                isDarkMode
                  ? "bg-[#181818]"
                  : "bg-[#f0f0f0]"
              }`}
            >
              <User size={18} />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p
                className={`font-medium truncate ${
                  isDarkMode
                    ? "text-white"
                    : "text-black"
                }`}
              >
                {isAuthenticated ? "Profile" : "Guest"}
              </p>

              <p
                className={`text-xs mt-0.5 ${
                  isDarkMode
                    ? "text-[#71717a]"
                    : "text-[#737373]"
                }`}
              >
                {!isAuthenticated
                  ? "Guest Mode"
                  : accountRole === "owner"
                  ? "Owner"
                  : accountRole === "pro"
                  ? "Pro Plan"
                  : "Free Plan"}
              </p>
            </div>

            {showProfileMenu ? (
              <ChevronDown
                size={17}
                className="shrink-0"
              />
            ) : (
              <ChevronUp
                size={17}
                className="shrink-0"
              />
            )}
          </button>
        </div>
      </aside>

      {/* =================================================
          CENTER CHAT
          ================================================= */}

      <main
        className={`relative flex-1 flex flex-col min-w-0 overflow-hidden transition-colors duration-300 ${
          isDarkMode
            ? "bg-black"
            : "bg-white"
        }`}
      >
        {/* Mobile header */}
        <div className={`flex items-center gap-3 border-b px-4 py-3 md:hidden ${
          isDarkMode ? "border-[#1a1a1a]" : "border-[#e5e5e5]"
        }`}>
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setIsMobileSidebarOpen(true)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isDarkMode ? "hover:bg-[#111111]" : "hover:bg-[#f3f3f3]"
            }`}
          >
            <Menu size={21} />
          </button>
          <span className="text-base font-semibold">OLANIX</span>
        </div>

        {/* MESSAGES */}

        <div className="relative z-10 w-full max-w-none mx-auto flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${
                  msg.sender === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`w-fit max-w-[80%] min-w-0 ${
                    msg.sender === "user"
                      ? "ml-auto"
                      : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-full max-w-full text-sm leading-7 break-words ${
                      msg.sender === "user"
                        ? `w-fit rounded-2xl px-4 py-3 ${
                            isDarkMode
                              ? "bg-[#123b2b] border border-[#1b513a] text-white rounded-br-none shadow-lg"
                              : "bg-[#dceee4] border border-[#c4dfcf] text-[#10291d] rounded-br-none shadow-sm"
                          }`
                        : isDarkMode
                        ? "bg-transparent border-0 p-0 text-[#e4e4e7]"
                        : "bg-transparent border-0 p-0 text-[#171717]"
                    }`}
                  >
                    {/* IMAGE */}

                    {msg.sender ===
                      "user" &&
                      msg.image && (
                        <div className="mb-3">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingImage(
                                msg.image!
                              )
                            }
                            className="block cursor-zoom-in"
                            aria-label="View image"
                          >
                            <img
                              src={
                                msg.image
                              }
                              alt="Uploaded image"
                              className="block w-64 h-64 object-cover rounded-xl border border-[#333] shadow-md hover:opacity-90 transition"
                            />
                          </button>
                        </div>
                      )}

                    {/* MESSAGE */}

                    {msg.sender ===
                    "user" ? (
                      msg.text && (
                        <p className="whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )
                    ) : (
                      <div
                        className={`prose prose-sm max-w-none break-words ${
                          isDarkMode
                            ? "prose-invert"
                            : ""
                        }`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                          components={{
                            h1: ({
                              children,
                            }) => (
                              <h1 className="text-2xl font-bold mb-4 mt-1">
                                {children}
                              </h1>
                            ),

                            h2: ({
                              children,
                            }) => (
                              <h2 className="text-xl font-bold mb-3 mt-5">
                                {children}
                              </h2>
                            ),

                            h3: ({
                              children,
                            }) => (
                              <h3 className="text-lg font-bold mb-2 mt-4">
                                {children}
                              </h3>
                            ),

                            p: ({
                              children,
                            }) => (
                              <p className="mb-3 last:mb-0 leading-7">
                                {children}
                              </p>
                            ),

                            strong: ({
                              children,
                            }) => (
                              <strong className="font-bold">
                                {children}
                              </strong>
                            ),

                            ul: ({
                              children,
                            }) => (
                              <ul className="list-disc ml-6 mb-4 space-y-1">
                                {children}
                              </ul>
                            ),

                            ol: ({
                              children,
                            }) => (
                              <ol className="list-decimal ml-6 mb-4 space-y-1">
                                {children}
                              </ol>
                            ),

                            li: ({
                              children,
                            }) => (
                              <li className="pl-1">
                                {children}
                              </li>
                            ),

                            blockquote: ({
                              children,
                            }) => (
                              <blockquote
                                className={`border-l-4 pl-4 my-4 italic ${
                                  isDarkMode
                                    ? "border-[#444] text-[#a1a1aa]"
                                    : "border-[#d4d4d4] text-[#737373]"
                                }`}
                              >
                                {children}
                              </blockquote>
                            ),

                            hr: () => (
                              <hr
                                className={`my-5 ${
                                  isDarkMode
                                    ? "border-[#292929]"
                                    : "border-[#e5e5e5]"
                                }`}
                              />
                            ),

                            a: ({
                              children,
                              href,
                            }) => (
                              <a
                                href={
                                  href
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {
                                  children
                                }
                              </a>
                            ),

                            table: ({
                              children,
                            }) => (
                              <div className="overflow-x-auto w-full mb-4">
                                <table
                                  className={`w-full min-w-[500px] border-collapse text-sm ${
                                    isDarkMode
                                      ? "border-[#333]"
                                      : "border-[#d4d4d4]"
                                  }`}
                                >
                                  {
                                    children
                                  }
                                </table>
                              </div>
                            ),

                            thead: ({
                              children,
                            }) => (
                              <thead
                                className={
                                  isDarkMode
                                    ? "bg-[#151515]"
                                    : "bg-[#f3f3f3]"
                                }
                              >
                                {
                                  children
                                }
                              </thead>
                            ),

                            tbody: ({
                              children,
                            }) => (
                              <tbody>
                                {
                                  children
                                }
                              </tbody>
                            ),

                            tr: ({
                              children,
                            }) => (
                              <tr
                                className={
                                  isDarkMode
                                    ? "border-b border-[#333]"
                                    : "border-b border-[#e5e5e5]"
                                }
                              >
                                {
                                  children
                                }
                              </tr>
                            ),

                            th: ({
                              children,
                            }) => (
                              <th
                                className={`border px-4 py-3 text-left font-bold ${
                                  isDarkMode
                                    ? "border-[#333] bg-[#151515]"
                                    : "border-[#d4d4d4] bg-[#f3f3f3]"
                                }`}
                              >
                                {
                                  children
                                }
                              </th>
                            ),

                            td: ({
                              children,
                            }) => (
                              <td
                                className={`border px-4 py-3 align-top ${
                                  isDarkMode
                                    ? "border-[#333]"
                                    : "border-[#d4d4d4]"
                                }`}
                              >
                                {
                                  children
                                }
                              </td>
                            ),

                            code: ({
                              children,
                            }) => (
                              <code
                                className={`px-1.5 py-0.5 rounded text-[0.9em] ${
                                  isDarkMode
                                    ? "bg-[#181818]"
                                    : "bg-[#eeeeee]"
                                }`}
                              >
                                {
                                  children
                                }
                              </code>
                            ),

                            pre: ({
                              children,
                            }) => {
                              const codeNode = children as {
                                props?: { children?: unknown; className?: string };
                              };
                              const codeText =
                                typeof codeNode?.props?.children === "string"
                                  ? codeNode.props.children.replace(/\\n$/, "")
                                  : "";

                              return (
                                <div className={`my-4 overflow-hidden rounded-xl border ${
                                  isDarkMode
                                    ? "border-[#252525] bg-[#050505]"
                                    : "border-[#e5e5e5] bg-[#f5f5f5]"
                                }`}>
                                  <div className={`flex items-center justify-between px-3 py-2 text-xs ${
                                    isDarkMode
                                      ? "border-b border-[#252525] text-gray-400"
                                      : "border-b border-[#e5e5e5] text-gray-600"
                                  }`}>
                                    <span>
                                      {codeNode?.props?.className?.replace("language-", "") || "Code"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(codeText);
                                        } catch (error) {
                                          console.error("Could not copy code:", error);
                                        }
                                      }}
                                      className={`rounded-md px-2 py-1 transition-colors ${
                                        isDarkMode
                                          ? "hover:bg-[#202020] hover:text-white"
                                          : "hover:bg-[#e7e7e7] hover:text-black"
                                      }`}
                                      aria-label="Copy code"
                                      title="Copy code"
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        <Copy size={14} />
                                        Copy code
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => shareText(codeText)}
                                      className={`rounded-md px-2 py-1 transition-colors ${isDarkMode ? "hover:bg-[#202020] hover:text-white" : "hover:bg-[#e7e7e7] hover:text-black"}`}
                                      aria-label="Share code"
                                      title="Share code"
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        <Share2 size={14} /> Share
                                      </span>
                                    </button>
                                  </div>
                                  <pre className="overflow-x-auto p-4 text-sm">
                                    {children}
                                  </pre>
                                </div>
                              );
                            },
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.sender === "ai" && (
                    <div className={`mt-3 flex flex-wrap items-center gap-1 ${isDarkMode ? "text-[#888]" : "text-[#737373]"}`}>
                      <button type="button" onClick={() => navigator.clipboard.writeText(msg.text)} title="Copy reply" aria-label="Copy reply" className={`rounded-lg p-2 transition ${isDarkMode ? "hover:bg-[#1b1b1b] hover:text-white" : "hover:bg-[#f0f0f0] hover:text-black"}`}><Copy size={16} /></button>
                      <button type="button" onClick={() => setMessageFeedback((current) => ({ ...current, [msg.id]: current[msg.id] === "like" ? undefined as never : "like" }))} title="Like" aria-label="Like reply" aria-pressed={messageFeedback[msg.id] === "like"} className={`rounded-lg p-2 transition ${messageFeedback[msg.id] === "like" ? "text-green-500" : ""} ${isDarkMode ? "hover:bg-[#1b1b1b]" : "hover:bg-[#f0f0f0]"}`}><ThumbsUp size={16} /></button>
                      <button type="button" onClick={() => setMessageFeedback((current) => ({ ...current, [msg.id]: current[msg.id] === "dislike" ? undefined as never : "dislike" }))} title="Dislike" aria-label="Dislike reply" aria-pressed={messageFeedback[msg.id] === "dislike"} className={`rounded-lg p-2 transition ${messageFeedback[msg.id] === "dislike" ? "text-red-500" : ""} ${isDarkMode ? "hover:bg-[#1b1b1b]" : "hover:bg-[#f0f0f0]"}`}><ThumbsDown size={16} /></button>
                      <button type="button" onClick={() => readAloud(msg.text)} title="Read aloud" aria-label="Read reply aloud" className={`rounded-lg p-2 transition ${isDarkMode ? "hover:bg-[#1b1b1b] hover:text-white" : "hover:bg-[#f0f0f0] hover:text-black"}`}><Volume2 size={16} /></button>
                      <button type="button" onClick={() => shareText(msg.text)} title="Share reply" aria-label="Share reply" className={`rounded-lg p-2 transition ${isDarkMode ? "hover:bg-[#1b1b1b] hover:text-white" : "hover:bg-[#f0f0f0] hover:text-black"}`}><Share2 size={16} /></button>
                      <button type="button" onClick={() => retryResponse(msg.id)} disabled={loading} title="Try again" aria-label="Try again" className={`rounded-lg p-2 transition disabled:opacity-40 ${isDarkMode ? "hover:bg-[#1b1b1b] hover:text-white" : "hover:bg-[#f0f0f0] hover:text-black"}`}><RefreshCw size={16} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* LOADING */}

            {loading && (
              <div className="flex justify-start">
                <div
                  className={`rounded-2xl rounded-bl-none px-4 py-3 border ${
                    isDarkMode
                      ? "bg-[#0a0a0a] border-[#1f1f1f]"
                      : "bg-[#fafafa] border-[#e5e5e5]"
                  }`}
                >
                  <div
                    className={`w-10 h-2 rounded-full animate-pulse ${
                      isDarkMode
                        ? "bg-[#737373]"
                        : "bg-[#8a8a8a]"
                    }`}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* =================================================
            LOCATION
            ================================================= */}

        {locationStatus !==
          "granted" && (
          <div className="relative z-20 w-full max-w-3xl mx-auto px-5 pb-3">
            <div
              className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
                isDarkMode
                  ? "bg-[#0a0a0a] border-[#222222]"
                  : "bg-[#fafafa] border-[#e5e5e5]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                    isDarkMode
                      ? "bg-[#111111]"
                      : "bg-[#f0f0f0]"
                  }`}
                >
                  <MapPin
                    size={18}
                    className="text-blue-500"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Enable location
                  </p>

                  <p
                    className={`text-xs mt-1 ${
                      isDarkMode
                        ? "text-[#71717a]"
                        : "text-[#737373]"
                    }`}
                  >
                    Allow OLANIX to provide
                    local weather and
                    location-based
                    information.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {locationStatus ===
                  "denied" && (
                  <button
                    type="button"
                    onClick={() =>
                      setLocationStatus(
                        "unknown"
                      )
                    }
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode
                        ? "hover:bg-[#151515]"
                        : "hover:bg-[#eeeeee]"
                    }`}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    requestLocation
                  }
                  disabled={
                    locationStatus ===
                    "requesting"
                  }
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm transition disabled:opacity-50"
                >
                  {locationStatus ===
                  "requesting"
                    ? "Requesting..."
                    : "Allow Location"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            INPUT
            ================================================= */}

        <div className={`z-20 w-full max-w-none mx-auto px-3 sm:px-6 lg:px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 transition-all duration-200 ${
          messages.length === 0 && !loading
            ? "absolute left-0 right-0 top-1/2 -translate-y-1/2 md:top-1/2"
            : "relative"
        }`}>
          <div className="mx-auto w-full max-w-none">
          <div
            className={`relative border rounded-[2rem] px-3 shadow-lg transition-all duration-200 ${
              imagePreview ? "pt-32 pb-2.5" : "py-2.5"
            } ${
              isDarkMode
                ? "bg-[#080808] border-[#252525] focus-within:border-[#3a3a3a]"
                : "bg-white border-[#d4d4d4] focus-within:border-[#a3a3a3]"
            }`}
          >
            {/* IMAGE PREVIEW */}

            {imagePreview && (
              <div className="absolute left-4 top-4">
                <div className="relative">
                  <img
                    src={
                      imagePreview
                    }
                    alt="Selected image"
                    className="w-24 h-24 object-cover rounded-xl border border-[#333] shadow-lg"
                  />

                  <button
                    type="button"
                    onClick={
                      removeSelectedImage
                    }
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black text-white border border-[#444] flex items-center justify-center hover:bg-[#222] transition shadow-lg"
                    aria-label="Remove image"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* FILE INPUT */}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx,.csv,.xlsx,.md"
              onChange={
                handleImageSelect
              }
              className="hidden"
            />

            <div className={`flex w-full items-center gap-2 ${messages.length === 0 && !loading ? "min-h-[48px]" : "items-end"}`}>
              {/* PLUS / UPLOAD */}

              <div ref={plusMenuRef} className="relative shrink-0">
                {showPlusMenu && (
                  <div className={`absolute bottom-14 left-0 z-[150] w-[min(300px,calc(100vw-2rem))] max-h-[min(360px,55dvh)] overflow-y-auto overscroll-contain rounded-2xl border p-1.5 shadow-2xl ${
                    isDarkMode ? "bg-[#242424] border-[#3a3a3a] text-white" : "bg-white border-[#e5e5e5] text-black"
                  }`}>
                    {[
                      { label: "Add photos & files", detail: "Upload from computer", icon: Paperclip, action: "upload" },
                      { label: "Add from library", detail: "Browse saved content", icon: LibraryBig, action: "library" },
                      { label: "Create image", detail: "Describe an image to create", icon: ImagePlus, action: "create-image" },
                      { label: "Web search", detail: "Ask for current web information", icon: Globe, action: "web-search" },
                      { label: "Deep research", detail: "Explore a topic in depth", icon: FlaskConical, action: "deep-research" },
                      { label: "Sketch", detail: "Open sketch workspace", icon: Pencil, action: "sketch" },
                      { label: "Thinking", detail: "Reason through a harder question", icon: Brain, action: "thinking" },
                      { label: "GitHub", detail: "Open GitHub connection", icon: Code2, action: "github" },
                      { label: "OpenAI Platform", detail: "Manage API keys and usage", icon: ExternalLink, action: "openai" },
                      { label: "Notion", detail: "Connect notes and documents", icon: LibraryBig, action: "notion" },
                    ].map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.action}
                          type="button"
                          onClick={() => {
                            setShowPlusMenu(false);
                            if (item.action === "upload") {
                              imageInputRef.current?.click();
                            } else if (item.action === "web-search" || item.action === "deep-research" || item.action === "thinking" || item.action === "create-image") {
                              const prompts: Record<string, string> = {
                                "web-search": "Search the web for current, reliable information about: ",
                                "deep-research": "Conduct deep research on this topic, compare reliable sources, and provide citations: ",
                                "thinking": "Think carefully through this problem step by step, checking assumptions and explaining the reasoning clearly: ",
                                "create-image": "Help me create an image. Write a detailed image-generation prompt for: ",
                              };
                              setInputMessage((current) => current ? current + "\n" + prompts[item.action] : prompts[item.action]);
                              textareaRef.current?.focus();
                            } else if (item.action === "github") {
                              window.open("https://github.com", "_blank", "noopener,noreferrer");
                            } else if (item.action === "openai") {
                              window.open("https://platform.openai.com", "_blank", "noopener,noreferrer");
                            } else if (item.action === "notion") {
                              window.open("https://www.notion.so", "_blank", "noopener,noreferrer");
                            } else {
                              setActiveFeature(item.label);
                            }
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                            isDarkMode ? "hover:bg-[#333333]" : "hover:bg-[#f3f3f3]"
                          }`}
                        >
                          <ItemIcon size={17} className={`shrink-0 ${
                            item.action === "web-search" ? "text-sky-500" :
                            item.action === "create-image" ? "text-amber-500" :
                            item.action === "thinking" ? "text-violet-400" :
                            item.action === "deep-research" ? "text-blue-500" :
                            isDarkMode ? "text-[#d4d4d8]" : "text-[#525252]"
                          }`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium">{item.label}</span>
                            <span className={`block truncate text-[11px] mt-0.5 ${
                              isDarkMode ? "text-[#a1a1aa]" : "text-[#737373]"
                            }`}>{item.detail}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPlusMenu((open) => !open)}
                  disabled={loading}
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition ${
                    isDarkMode
                      ? "text-[#d4d4d8] hover:bg-[#151515] hover:text-white"
                      : "text-[#525252] hover:bg-[#f3f3f3] hover:text-black"
                  }`}
                  aria-label="Open attachments and tools"
                  aria-expanded={showPlusMenu}
                >
                  <Plus size={22} />
                </button>
              </div>

              {/* TEXTAREA */}

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={
                  handleInputChange
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Ask anything"
                className={`flex-1 min-w-0 bg-transparent text-sm focus:outline-none resize-none leading-6 max-h-[180px] overflow-y-auto py-2 self-center ${
                  isDarkMode
                    ? "text-white placeholder-[#52525b]"
                    : "text-black placeholder-[#a3a3a3]"
                }`}
              />

              {/* SEND */}

              <button
                type="button"
                onClick={
                  handleSendMessage
                }
                disabled={
                  (!inputMessage.trim() &&
                    !selectedImage) ||
                  loading
                }
                className={`ml-3 mb-1 w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition ${
                  (inputMessage.trim() ||
                    selectedImage) &&
                  !loading
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : isDarkMode
                    ? "bg-[#171717] text-[#52525b]"
                    : "bg-[#eeeeee] text-[#a3a3a3]"
                }`}
              >
                <Send size={17} />
              </button>
            </div>
          </div>

          </div>
          <p
            className={`text-[11px] text-center mt-2 ${
              isDarkMode
                ? "text-[#52525b]"
                : "text-[#a3a3a3]"
            }`}
          >
            OLANIX can make mistakes.
            Check important
            information.
          </p>
        </div>
      </main>

      {/* =================================================
          WORKSPACE FEATURE PANEL
          ================================================= */}

      {activeFeature && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setActiveFeature(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-feature-title"
            onClick={(event) => event.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
              isDarkMode
                ? "bg-[#0d0d0d] border-[#292929] text-white"
                : "bg-white border-[#e5e5e5] text-black"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-500">
                  OLANIX workspace
                </p>
                <h2 id="workspace-feature-title" className="mt-2 text-xl font-semibold">
                  {activeFeature}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveFeature(null)}
                aria-label={`Close ${activeFeature}`}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                  isDarkMode ? "hover:bg-[#1c1c1c]" : "hover:bg-[#f3f3f3]"
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <p className={`mt-4 text-sm leading-6 ${
              isDarkMode ? "text-[#a1a1aa]" : "text-[#525252]"
            }`}>
              {activeFeature === "Explore"
                ? "Discover more ways to use OLANIX. More tools and curated experiences can be added here."
                : activeFeature === "Plugins"
                ? "A dedicated home for connected tools and integrations. Plugin connections are not available in this build yet."
                : activeFeature === "Codex"
                ? "A coding workspace for building, understanding, and improving projects. The dedicated coding tools are coming in a future update."
                : "A place for saved files, images, and useful content. Persistent library management is not available in this build yet."}
            </p>
            <button
              type="button"
              onClick={() => setActiveFeature(null)}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          SETTINGS POPUP
          ================================================= */}

      {showSettings && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() =>
            setShowSettings(
              false
            )
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(e) =>
              e.stopPropagation()
            }
            className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border shadow-2xl ${
              isDarkMode
                ? "bg-[#0d0d0d] border-[#292929] text-white"
                : "bg-white border-[#e5e5e5] text-black"
            }`}
          >
            {/* SETTINGS HEADER */}

            <div
              className={`sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b backdrop-blur-xl ${
                isDarkMode
                  ? "border-[#292929] bg-[#0d0d0d]/95"
                  : "border-[#e5e5e5] bg-white/95"
              }`}
            >
              <div>
                <h2
                  id="settings-title"
                  className="text-xl font-semibold"
                >
                  Settings
                </h2>

                <p
                  className={`text-xs mt-1 ${
                    isDarkMode
                      ? "text-[#71717a]"
                      : "text-[#737373]"
                  }`}
                >
                  Customize your OLANIX
                  experience.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSettings(
                    false
                  )
                }
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                  isDarkMode
                    ? "text-[#a1a1aa] hover:bg-[#1c1c1c] hover:text-white"
                    : "text-[#737373] hover:bg-[#f3f3f3] hover:text-black"
                }`}
                aria-label="Close settings"
              >
                <X size={19} />
              </button>
            </div>

            {/* SETTINGS CONTENT */}

            <div className="p-5 sm:p-6 space-y-4">

              {/* APPEARANCE */}

              <div
                className={`rounded-2xl border p-4 ${
                  isDarkMode
                    ? "bg-[#111111] border-[#252525]"
                    : "bg-[#fafafa] border-[#e5e5e5]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                        isDarkMode
                          ? "bg-[#1a1a1a]"
                          : "bg-[#eeeeee]"
                      }`}
                    >
                      {isDarkMode ? (
                        <Moon
                          size={19}
                          className="text-blue-500"
                        />
                      ) : (
                        <Sun
                          size={19}
                          className="text-blue-500"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Appearance
                      </p>

                      <p
                        className={`text-xs mt-1 ${
                          isDarkMode
                            ? "text-[#71717a]"
                            : "text-[#737373]"
                        }`}
                      >
                        {isDarkMode
                          ? "Dark mode"
                          : "Light mode"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      toggleTheme
                    }
                    className={`relative w-12 h-7 shrink-0 rounded-full transition ${
                      isDarkMode
                        ? "bg-blue-600"
                        : "bg-[#d4d4d4]"
                    }`}
                    aria-label="Toggle appearance"
                    aria-pressed={
                      isDarkMode
                    }
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        isDarkMode
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* LOCATION */}

              <div
                className={`rounded-2xl border p-4 ${
                  isDarkMode
                    ? "bg-[#111111] border-[#252525]"
                    : "bg-[#fafafa] border-[#e5e5e5]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                        isDarkMode
                          ? "bg-[#1a1a1a]"
                          : "bg-[#eeeeee]"
                      }`}
                    >
                      <MapPin
                        size={19}
                        className="text-blue-500"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Location
                      </p>

                      <p
                        className={`text-xs leading-5 mt-1 ${
                          isDarkMode
                            ? "text-[#71717a]"
                            : "text-[#737373]"
                        }`}
                      >
                        {locationStatus ===
                        "granted"
                          ? "Location access is enabled."
                          : locationStatus ===
                            "requesting"
                          ? "Requesting location access..."
                          : locationStatus ===
                            "denied"
                          ? "Location access was denied."
                          : "Location access is not enabled."}
                      </p>
                    </div>
                  </div>

                  {locationStatus ===
                  "granted" ? (
                    <div className="shrink-0 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-medium">
                      Enabled
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        requestLocation
                      }
                      disabled={
                        locationStatus ===
                        "requesting"
                      }
                      className="shrink-0 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50"
                    >
                      {locationStatus ===
                      "requesting"
                        ? "Requesting..."
                        : "Allow"}
                    </button>
                  )}
                </div>
              </div>

              {/* MEMORY */}

              <div
                className={`rounded-2xl border p-4 ${
                  isDarkMode
                    ? "bg-[#111111] border-[#252525]"
                    : "bg-[#fafafa] border-[#e5e5e5]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                        isDarkMode
                          ? "bg-[#1a1a1a]"
                          : "bg-[#eeeeee]"
                      }`}
                    >
                      <Sparkles
                        size={19}
                        className="text-blue-500"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Memory
                      </p>

                      <p
                        className={`text-xs leading-5 mt-1 ${
                          isDarkMode
                            ? "text-[#71717a]"
                            : "text-[#737373]"
                        }`}
                      >
                        Let OLANIX remember
                        useful information
                        about you.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      isDarkMode
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-blue-50 text-blue-700"
                    }`}
                    aria-label="Memory is always enabled"
                  >
                    Always on
                  </div>
                </div>

                <div
                  className={`mt-3 pt-3 border-t text-[11px] ${
                    isDarkMode
                      ? "border-[#252525] text-[#52525b]"
                      : "border-[#e5e5e5] text-[#a3a3a3]"
                  }`}
                >
                  "Memory is enabled for OLANIX."
                </div>
              </div>

              {/* OLANIX */}

              <div
                className={`rounded-2xl border p-4 ${
                  isDarkMode
                    ? "bg-[#111111] border-[#252525]"
                    : "bg-[#fafafa] border-[#e5e5e5]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                      isDarkMode
                        ? "bg-[#1a1a1a]"
                        : "bg-[#eeeeee]"
                    }`}
                  >
                    <Sparkles
                      size={19}
                      className="text-blue-500"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      OLANIX
                    </p>

                    <p
                      className={`text-xs leading-5 mt-1 ${
                        isDarkMode
                          ? "text-[#71717a]"
                          : "text-[#737373]"
                      }`}
                    >
                      Your AI assistant for
                      questions, coding,
                      learning, ideas and
                      more.
                    </p>

                    <p
                      className={`text-[11px] mt-2 ${
                        isDarkMode
                          ? "text-[#52525b]"
                          : "text-[#a3a3a3]"
                      }`}
                    >
                      OLANIX settings are
                      saved when
                      applicable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SETTINGS FOOTER */}

            <div
              className={`sticky bottom-0 px-5 sm:px-6 py-4 border-t backdrop-blur-xl ${
                isDarkMode
                  ? "border-[#292929] bg-[#0d0d0d]/95"
                  : "border-[#e5e5e5] bg-white/95"
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setShowSettings(
                    false
                  )
                }
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          FULL SCREEN IMAGE VIEWER
          ================================================= */}

      {viewingImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6"
          onClick={() =>
            setViewingImage(null)
          }
        >
          <button
            type="button"
            onClick={() =>
              setViewingImage(null)
            }
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-black transition"
            aria-label="Close image viewer"
          >
            <X size={20} />
          </button>

          <img
            src={viewingImage}
            alt="Expanded uploaded image"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          />
        </div>
      )}
    </div>
  );
}