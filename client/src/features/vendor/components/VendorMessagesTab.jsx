import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { Panel, EmptyState, VendorButton } from "./VendorUi.jsx";
import { formatRelativeTime } from "../vendorShared.js";
import { api } from "../../../services/api.js";

let vendorSocket = null;

const formatTime = (ts) => {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday)
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Merge helper: combine server chats into local without losing optimistic msgs ──
const mergeChats = (serverChats, localChats) => {
  return serverChats.map((incoming) => {
    const existing = localChats.find((c) => c._id === incoming._id);
    if (!existing) return incoming;

    const serverMsgs = incoming.messages || [];
    const localMsgs = existing.messages || [];

    // Build a map of real (non-temp) server message IDs
    const serverIds = new Set(serverMsgs.map((m) => m._id).filter(Boolean));

    // Keep local temp messages that server hasn't confirmed yet
    const pendingTemps = localMsgs.filter(
      (m) => m._id?.startsWith("temp-") && !serverIds.has(m._id)
    );

    return {
      ...incoming,
      messages: [...serverMsgs, ...pendingTemps],
    };
  });
};

// ─── Component ────────────────────────────────────────────────────────────────
const VendorMessagesTab = ({ restaurant, chats = [] }) => {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [localChats, setLocalChats] = useState(() => chats);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sync server chats → local without destroying optimistic messages
  useEffect(() => {
    setLocalChats((prev) =>
      prev.length === 0 ? chats : mergeChats(chats, prev)
    );
  }, [chats]);

  // Socket: only handle INCOMING customer/admin messages
  useEffect(() => {
    if (!restaurant) return;
    const vendorId = restaurant.vendor || restaurant._id;
    if (!vendorId) return;

    vendorSocket = io("http://localhost:5000", { withCredentials: true });
    vendorSocket.emit("join", { userId: String(vendorId), role: "vendor" });

    const handleIncoming = ({ chatId, message }) => {
      // Vendor's OWN messages come via optimistic + server replace.
      // Socket should only append CUSTOMER or ADMIN messages to avoid duplicates.
      if (message.sender === "vendor") return;

      setLocalChats((prev) =>
        prev.map((chat) => {
          if (String(chat._id) !== String(chatId)) return chat;
          const msgs = chat.messages || [];
          const already = msgs.some(
            (m) => m._id && message._id && String(m._id) === String(message._id)
          );
          if (already) return chat;
          return {
            ...chat,
            messages: [...msgs, message],
            lastMessage: message.text,
            lastMessageTime: message.createdAt || new Date().toISOString(),
            unreadCount:
              String(chatId) !== String(selectedChatId)
                ? (chat.unreadCount || 0) + 1
                : 0,
          };
        })
      );
    };

    vendorSocket.on("new_message", handleIncoming);
    vendorSocket.on("message_received", handleIncoming);

    return () => {
      vendorSocket?.disconnect();
      vendorSocket = null;
    };
  }, [restaurant?.vendor, restaurant?._id, selectedChatId]);

  // Join room + mark read
  useEffect(() => {
    if (!selectedChatId) return;
    vendorSocket?.emit("join_chat", { chatId: selectedChatId });
    api.patch(`/chats/${selectedChatId}/read`).catch(() => {});
    setLocalChats((prev) =>
      prev.map((c) =>
        c._id === selectedChatId ? { ...c, unreadCount: 0 } : c
      )
    );
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [selectedChatId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChatId, localChats]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !selectedChatId || sending) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      sender: "vendor",
      text,
      createdAt: new Date().toISOString(),
    };

    // Add optimistic immediately
    setLocalChats((prev) =>
      prev.map((chat) =>
        chat._id === selectedChatId
          ? {
              ...chat,
              messages: [...(chat.messages || []), optimistic],
              lastMessage: text,
              lastMessageTime: new Date().toISOString(),
            }
          : chat
      )
    );

    try {
      const res = await api.post(`/vendor/chats/${selectedChatId}/message`, { text });
      const savedMsg = res.data;
      // Replace temp with real server message
      setLocalChats((prev) =>
        prev.map((chat) => {
          if (chat._id !== selectedChatId) return chat;
          return {
            ...chat,
            messages: (chat.messages || []).map((m) =>
              m._id === tempId ? { ...savedMsg } : m
            ),
          };
        })
      );
    } catch {
      // Revert on error
      setLocalChats((prev) =>
        prev.map((chat) => {
          if (chat._id !== selectedChatId) return chat;
          return {
            ...chat,
            messages: (chat.messages || []).filter((m) => m._id !== tempId),
          };
        })
      );
    } finally {
      setSending(false);
    }
  }, [messageText, selectedChatId, sending]);

  const currentChat =
    localChats.find((c) => c._id === selectedChatId) || null;
  const totalUnread = localChats.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  if (!restaurant) {
    return (
      <EmptyState
        title="Store Not Ready"
        description="Complete your store profile to access messages."
        tone="info"
      />
    );
  }

  return (
    <div
      className="grid gap-4 xl:grid-cols-[340px,1fr]"
      style={{ height: "calc(100vh - 120px)", minHeight: 600 }}
    >
      {/* ── LEFT: Conversation list ───────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <h2 className="text-sm font-black text-white tracking-tight">
                Messages
              </h2>
            </div>
            {totalUnread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-5 px-2 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white"
              >
                {totalUnread}
              </motion.span>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">
              🔍
            </span>
            <input
              placeholder="Search customers..."
              className="w-full rounded-xl border border-zinc-800 bg-red-300 pl-9 pr-4 py-2.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {localChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
              <div className="h-14 w-14 rounded-2xl bg-blue-400 border border-red-800 flex items-center justify-center text-2xl mb-3">
                📭
              </div>
              <p className="text-sm font-bold text-zinc-400">No conversations</p>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                Customer messages will appear here.
              </p>
            </div>
          ) : (
            localChats.map((chat) => {
              const isSelected = chat._id === selectedChatId;
              const unread = chat.unreadCount || 0;
              const name = chat.customer?.name || "Customer";
              const initial = name[0].toUpperCase();
              const lastTime = chat.lastMessageTime
                ? formatRelativeTime(chat.lastMessageTime)
                : "";

              return (
                <motion.button
                  key={chat._id}
                  onClick={() => setSelectedChatId(chat._id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? "bg-indigo-500/10 border-indigo-500/30"
                      : "border-transparent hover:bg-zinc-900/80 hover:border-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with gradient */}
                    <div className="relative shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black text-white ${
                          isSelected
                            ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                            : "bg-gradient-to-br from-zinc-700 to-zinc-800"
                        }`}
                      >
                        {initial}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white border-2 border-[#0c0c0e]">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs font-bold truncate ${
                            unread > 0 ? "text-white" : "text-zinc-300"
                          }`}
                        >
                          {name}
                        </p>
                        <p className="text-[10px] text-zinc-600 shrink-0">
                          {lastTime}
                        </p>
                      </div>
                      <p
                        className={`text-[11px] truncate ${
                          unread > 0
                            ? "text-zinc-400 font-semibold"
                            : "text-zinc-600"
                        }`}
                      >
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat window ───────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#08080a]">
        <AnimatePresence mode="wait">
          {!currentChat ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center select-none"
            >
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl">
                  📨
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center text-sm">
                  💬
                </div>
              </div>
              <h3 className="text-base font-black text-zinc-300 tracking-tight">
                No chat selected
              </h3>
              <p className="text-xs text-zinc-600 mt-2 max-w-[200px] leading-relaxed">
                Select a conversation from the left to start replying
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={currentChat._id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex flex-col h-full"
            >
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/60 shrink-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                  {(currentChat.customer?.name || "C")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">
                    {currentChat.customer?.name || "Customer"}
                  </p>
                  <p className="text-[10px] text-zinc-600 truncate">
                    {currentChat.customer?.email || ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1 shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    Active
                  </span>
                </div>
              </div>

              {/* Date divider helper */}
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
                {(currentChat.messages || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                    <span className="text-3xl mb-2">💬</span>
                    <p className="text-xs text-zinc-500">
                      Customer will start the conversation
                    </p>
                  </div>
                ) : (
                  (() => {
                    const msgs = currentChat.messages || [];
                    return msgs.map((msg, i) => {
                      const isMe =
                        msg.sender === "vendor" || msg.sender === "admin";
                      const isAdmin = msg.sender === "admin";
                      const isSending = msg._id?.startsWith("temp-");
                      const prevMsg = msgs[i - 1];
                      const nextMsg = msgs[i + 1];
                      const isFirst =
                        !prevMsg || prevMsg.sender !== msg.sender;
                      const isLast =
                        !nextMsg || nextMsg.sender !== msg.sender;

                      return (
                        <div
                          key={msg._id || i}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirst ? "mt-3" : "mt-0.5"}`}
                        >
                          {/* Sender name — only on first in group */}
                          {isFirst && (
                            <span className="text-[10px] font-bold text-zinc-600 mb-1 px-1">
                              {isAdmin
                                ? "🛡️ Admin"
                                : isMe
                                ? `🏪 ${restaurant?.name || "You"}`
                                : `👤 ${currentChat.customer?.name || "Customer"}`}
                            </span>
                          )}

                          <div
                            className={`px-4 py-2.5 text-sm leading-relaxed break-words max-w-[72%] ${
                              isAdmin
                                ? "bg-purple-600 text-white"
                                : isMe
                                ? `bg-indigo-600 text-white ${isSending ? "opacity-50" : ""}`
                                : "bg-zinc-800/80 text-zinc-100 border border-zinc-700/40"
                            } ${
                              isMe
                                ? isFirst && isLast
                                  ? "rounded-2xl rounded-tr-md"
                                  : isFirst
                                  ? "rounded-2xl rounded-tr-md rounded-br-sm"
                                  : isLast
                                  ? "rounded-2xl rounded-tr-sm rounded-br-md"
                                  : "rounded-2xl rounded-r-sm"
                                : isFirst && isLast
                                ? "rounded-2xl rounded-tl-md"
                                : isFirst
                                ? "rounded-2xl rounded-tl-md rounded-bl-sm"
                                : isLast
                                ? "rounded-2xl rounded-tl-sm rounded-bl-md"
                                : "rounded-2xl rounded-l-sm"
                            }`}
                          >
                            {msg.text}
                          </div>

                          {/* Timestamp — only on last in group */}
                          {isLast && (
                            <div
                              className={`flex items-center gap-1 mt-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}
                            >
                              <span className="text-[9px] text-zinc-700">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isSending && (
                                <span className="text-[9px] text-zinc-700 animate-pulse">
                                  Sending...
                                </span>
                              )}
                              {isMe && !isSending && (
                                <span className="text-[10px] text-indigo-500">
                                  ✓
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-zinc-800/60 shrink-0 bg-[#0c0c0e]">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a reply..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-indigo-500/40 focus:bg-zinc-800/80 transition-all"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSend}
                    disabled={sending || !messageText.trim()}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                  >
                    {sending ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <>Send <span>🚀</span></>
                    )}
                  </motion.button>
                </div>
                <p className="text-[10px] text-zinc-700 mt-1.5 text-right">
                  🏪 Replying as{" "}
                  <span className="text-zinc-600">
                    {restaurant?.name || "your restaurant"}
                  </span>{" "}
                  · Enter to send
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VendorMessagesTab;
