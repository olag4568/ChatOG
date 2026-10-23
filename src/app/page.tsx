"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";

import {
  Home as HomeIcon,
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
};

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
  const [loading, setLoading] = useState(false);
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

  // =====================================================
  // MEMORY
  // =====================================================

  const [memoryEnabled, setMemoryEnabled] = useState(true);

  const [accountRole, setAccountRole] =
    useState<AccountRole>("free");

  const memoryAccess =
    accountRole === "pro" ||
    accountRole === "owner";

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
        setMemoryEnabled(false);
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
        setMemoryEnabled(false);

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

      if (role === "free") {
        setMemoryEnabled(false);
        return;
      }

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
  // TOGGLE MEMORY
  // =====================================================

  const toggleMemory = async () => {
    // Free users cannot use memory
    if (!memoryAccess) {
      setMemoryEnabled(false);
      return;
    }

    const newValue = !memoryEnabled;

    // Update UI immediately
    setMemoryEnabled(newValue);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMemoryEnabled(!newValue);
        return;
      }

      const {
        data: existingSettings,
        error: settingsError,
      } = await supabase
        .from("user_settings")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsError) {
        console.warn(
          "MEMORY SETTINGS CHECK ERROR:",
          settingsError
        );

        setMemoryEnabled(!newValue);
        return;
      }

      if (existingSettings) {
        const { error } =
          await supabase
            .from("user_settings")
            .update({
              memory_enabled: newValue,
            })
            .eq("user_id", user.id);

        if (error) {
          console.warn(
            "MEMORY SETTING UPDATE ERROR:",
            error
          );

          setMemoryEnabled(!newValue);
          return;
        }
      } else {
        // Do NOT manually set role to free here.
        // The database default will handle new accounts.
        const { error } =
          await supabase
            .from("user_settings")
            .insert({
              user_id: user.id,
              dark_mode: isDarkMode,
              notifications: true,
              memory_enabled: newValue,
            });

        if (error) {
          console.warn(
            "MEMORY SETTING INSERT ERROR:",
            error
          );

          setMemoryEnabled(!newValue);
          return;
        }
      }
    } catch (error) {
      console.warn(
        "MEMORY SETTING SAVE ERROR:",
        error
      );

      setMemoryEnabled(!newValue);
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

    if (userError || !user) {
      throw new Error(
        "You must be logged in to save chat history."
      );
    }

    const chatTitle =
      firstMessage.trim()
        ? firstMessage
            .trim()
            .slice(0, 50)
        : "Image Chat";

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

    if (userError || !user) {
      throw new Error(
        "You must be logged in to save chat history."
      );
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

        if (canSaveChat) {
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
        } else {
          // Guests can chat normally, but their conversations are session-only.
          chatToSave = null;
          setChatId(null);
          window.history.replaceState({}, "", "/");
        }

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

                memoryEnabled:
                  memoryAccess
                    ? memoryEnabled
                    : false,
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

        if (
          typeof data.account
            ?.memoryEnabled ===
          "boolean"
        ) {
          setMemoryEnabled(
            data.account.memoryEnabled
          );
        } else if (
          typeof data.memory
            ?.enabled ===
          "boolean"
        ) {
          setMemoryEnabled(
            data.memory.enabled
          );
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

        await saveChatMessages(
          chatToSave,
          finalMessages
        );
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
      name: "Home",
      icon: HomeIcon,
    },
    {
      name: "New Chat",
      icon: MessageSquarePlus,
    },
    {
      name: "Explore",
      icon: Compass,
    },
    {
      name: "Image",
      icon: ImageIcon,
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
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r flex flex-col transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isDarkMode
            ? "bg-black border-[#1a1a1a]"
            : "bg-white border-[#e5e5e5]"
        }`}
      >
        {/* LOGO */}

        <div
          className={`h-20 flex items-center justify-between px-5 border-b ${
            isDarkMode
              ? "border-[#1a1a1a]"
              : "border-[#e5e5e5]"
          }`}
        >
          <div className="text-xl font-bold tracking-tight">
            Chat
            <span className="text-blue-500">
              OG
            </span>
          </div>

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

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  if (
                    item.name ===
                      "Home" ||
                    item.name ===
                      "New Chat"
                  ) {
                    handleNewChat();
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
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

        {/* PROFILE */}

        <div
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

        <div className="relative z-10 w-full max-w-3xl mx-auto flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-6">
          {messages.length === 0 &&
            !loading && (
              <div className="min-h-full flex flex-col items-center justify-center text-center px-4">
                <div
                  className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-5 ${
                    isDarkMode
                      ? "bg-[#0d0d0d] border-[#222222]"
                      : "bg-[#f7f7f7] border-[#e5e5e5]"
                  }`}
                >
                  <Sparkles
                    size={30}
                    className="text-blue-500"
                  />
                </div>

                <h1 className="text-4xl font-bold mb-3">
                  Chat
                  <span className="text-blue-500">
                    OG
                  </span>
                </h1>

                <p
                  className={`max-w-md text-sm leading-6 ${
                    isDarkMode
                      ? "text-[#71717a]"
                      : "text-[#737373]"
                  }`}
                >
                  Your AI assistant for
                  questions, ideas,
                  coding, learning and
                  more.
                </p>
              </div>
            )}

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
                    className={`w-fit max-w-full rounded-2xl px-4 py-3 text-sm leading-7 ${
                      msg.sender ===
                      "user"
                        ? isDarkMode
                          ? "bg-[#111111] border border-[#252525] text-white rounded-br-none shadow-lg"
                          : "bg-[#f3f3f3] border border-[#dedede] text-black rounded-br-none shadow-sm"
                        : isDarkMode
                        ? "bg-[#0a0a0a] border border-[#1f1f1f] text-[#e4e4e7] rounded-bl-none shadow-md"
                        : "bg-[#fafafa] border border-[#e5e5e5] text-[#171717] rounded-bl-none shadow-sm"
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
                            }) => (
                              <pre
                                className={`overflow-x-auto rounded-xl p-4 my-4 text-sm ${
                                  isDarkMode
                                    ? "bg-[#050505] border border-[#252525]"
                                    : "bg-[#f5f5f5] border border-[#e5e5e5]"
                                }`}
                              >
                                {
                                  children
                                }
                              </pre>
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
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

        <div className="relative z-20 w-full max-w-3xl mx-auto px-5 pb-6 pt-2">
          <div
            className={`relative border rounded-3xl px-4 shadow-2xl transition-all duration-200 ${
              imagePreview
                ? "pt-32 pb-2.5"
                : "py-2.5"
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
              accept="image/*"
              onChange={
                handleImageSelect
              }
              className="hidden"
            />

            <div className="flex items-end w-full">
              {/* IMAGE */}

              <button
                type="button"
                onClick={() =>
                  imageInputRef.current?.click()
                }
                disabled={loading}
                className={`mr-3 mb-2 w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition ${
                  isDarkMode
                    ? "text-[#71717a] hover:bg-[#151515] hover:text-white"
                    : "text-[#737373] hover:bg-[#f3f3f3] hover:text-black"
                }`}
                aria-label="Upload image"
              >
                <ImageIcon size={19} />
              </button>

              {/* SPARKLE */}

              <Sparkles
                size={18}
                className="text-blue-500 mr-3 mb-3 shrink-0"
              />

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
                placeholder="Ask me anything..."
                className={`flex-1 min-w-0 bg-transparent text-sm focus:outline-none resize-none leading-6 max-h-[180px] overflow-y-auto py-1 ${
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
          RIGHT SIDEBAR
          ================================================= */}

      <aside
        className={`w-80 shrink-0 border-l hidden lg:flex flex-col transition-colors duration-300 ${
          isDarkMode
            ? "bg-black border-[#1a1a1a]"
            : "bg-white border-[#e5e5e5]"
        }`}
      >
        {/* HEADER */}

        <div
          className={`h-20 flex items-center justify-between px-5 border-b ${
            isDarkMode
              ? "border-[#1a1a1a]"
              : "border-[#e5e5e5]"
          }`}
        >
          <div className="flex items-center gap-3">
            <History
              size={20}
              className="text-blue-500"
            />

            <span className="font-semibold text-lg">
              History
            </span>
          </div>

          <button
            type="button"
            onClick={
              loadRecentChats
            }
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
              isDarkMode
                ? "text-[#a1a1aa] hover:bg-[#151515] hover:text-white"
                : "text-[#737373] hover:bg-[#f3f3f3] hover:text-black"
            }`}
            aria-label="Reload history"
            title="Reload history"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {/* HISTORY */}

        <div className="flex-1 overflow-y-auto p-4">
          {recentChats.length ===
          0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  isDarkMode
                    ? "bg-[#111111]"
                    : "bg-[#f5f5f5]"
                }`}
              >
                <History
                  size={22}
                  className="text-blue-500"
                />
              </div>

              <p className="text-sm font-medium">
                {isAuthenticated ? "No chat history" : "Log in to save chat history"}
              </p>

              <p
                className={`text-xs mt-1 ${
                  isDarkMode
                    ? "text-[#52525b]"
                    : "text-[#a3a3a3]"
                }`}
              >
                {isAuthenticated
                  ? "Your conversations will appear here."
                  : "Create an account or log in to keep your conversations."}
              </p>

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
                >
                  Log in / Sign up
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentChats.map(
                (chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-1 rounded-xl transition ${
                      chat.id === chatId
                        ? isDarkMode
                          ? "bg-[#151515]"
                          : "bg-[#f3f3f3]"
                        : isDarkMode
                        ? "hover:bg-[#111111]"
                        : "hover:bg-[#f3f3f3]"
                    }`}
                  >
                    {/* OPEN */}

                    <button
                      type="button"
                      onClick={() =>
                        openChat(
                          chat.id
                        )
                      }
                      className={`flex-1 min-w-0 text-left px-3 py-3 rounded-xl text-sm transition ${
                        chat.id ===
                        chatId
                          ? isDarkMode
                            ? "text-white"
                            : "text-black"
                          : isDarkMode
                          ? "text-[#a1a1aa] hover:text-white"
                          : "text-[#525252] hover:text-black"
                      }`}
                      title={
                        chat.title ||
                        "Untitled chat"
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MessageSquarePlus
                          size={16}
                          className={`shrink-0 ${
                            chat.id ===
                            chatId
                              ? "text-blue-500"
                              : "opacity-50"
                          }`}
                        />

                        <span className="truncate">
                          {chat.title ||
                            "Untitled chat"}
                        </span>
                      </div>
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={(
                        e
                      ) => {
                        e.stopPropagation();

                        deleteChat(
                          chat.id
                        );
                      }}
                      className={`mr-2 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition ${
                        isDarkMode
                          ? "text-[#71717a] hover:bg-red-950 hover:text-red-400"
                          : "text-[#737373] hover:bg-red-50 hover:text-red-600"
                      }`}
                      aria-label="Delete chat"
                      title="Delete chat"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </aside>

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

                  <button
                    type="button"
                    onClick={
                      toggleMemory
                    }
                    disabled={
                      !memoryAccess
                    }
                    className={`relative w-12 h-7 shrink-0 rounded-full transition ${
                      !memoryAccess
                        ? "bg-[#333333] opacity-50 cursor-not-allowed"
                        : memoryEnabled
                        ? "bg-blue-600"
                        : isDarkMode
                        ? "bg-[#333333]"
                        : "bg-[#d4d4d4]"
                    }`}
                    aria-label="Toggle memory"
                    aria-pressed={
                      memoryEnabled
                    }
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        memoryEnabled &&
                        memoryAccess
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div
                  className={`mt-3 pt-3 border-t text-[11px] ${
                    isDarkMode
                      ? "border-[#252525] text-[#52525b]"
                      : "border-[#e5e5e5] text-[#a3a3a3]"
                  }`}
                >
                  {!memoryAccess
                    ? "Memory is available on Pro and Owner accounts."
                    : memoryEnabled
                    ? "Memory is enabled for OLANIX."
                    : "Memory is turned off."}
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