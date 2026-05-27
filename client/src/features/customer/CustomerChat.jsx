import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { api } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { SOCKET_URL } from "../../config/runtime.js";

let socket = null;

// ─── Constants ────────────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  { id: 1, text: "Where's my order? 🚗", icon: "📍" },
  { id: 2, text: "How long will it take?", icon: "⏱️" },
  { id: 3, text: "Is this item available?", icon: "✅" },
  { id: 4, text: "Can I change my order?", icon: "✏️" },
  { id: 5, text: "I have a special request 🙏", icon: "💬" },
  { id: 6, text: "My order is wrong ❌", icon: "⚠️" },
];

const BOT_RESPONSES = [
  "Thanks for reaching out! 🙏 We've received your message and our team will respond shortly.",
  "Hi there! Your message has been received. Our restaurant staff will get back to you soon. ⚡",
  "We got your message! Please hold on while we connect you with the restaurant. 🏪",
];

const BOT_AUTO_REPLY_DELAY = 45 * 1000;

const formatTime = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    className="flex items-end gap-2"
  >
    <div className="h-7 w-7 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-black text-orange-600 shrink-0">
      🏪
    </div>
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
        />
      ))}
    </div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const CustomerChat = ({ restaurantId, restaurantName, onClose }) => {
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [unread, setUnread] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sendError, setSendError] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const botTimerRef = useRef(null);
  const isMinimizedRef = useRef(false);
  const chatIdRef = useRef(null);

  useEffect(() => {
    isMinimizedRef.current = isMinimized;
  }, [isMinimized]);

  // ── Socket setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    // FIX: guard against missing user
    if (!user?._id) return;

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"], // FIX: fallback transport added
    });

    socket.emit("join", { userId: String(user._id), role: "customer" });

    const handleIncoming = ({ chatId, message }) => {
      if (message.sender === "customer") return;

      clearTimeout(botTimerRef.current);

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setChat((prev) => {
          if (!prev || String(prev._id) !== String(chatId)) return prev;
          const already = (prev.messages || []).some(
            (m) => m._id && message._id && String(m._id) === String(message._id)
          );
          if (already) return prev;
          return { ...prev, messages: [...(prev.messages || []), message] };
        });

        if (isMinimizedRef.current) {
          setUnread((n) => n + 1);
        }

        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        } catch {
          // Audio feedback is optional.
        }
      }, 1200);
    };

    socket.on("message_received", handleIncoming);
    socket.on("new_message", handleIncoming);

    return () => {
      socket?.disconnect();
      socket = null;
      clearTimeout(botTimerRef.current);
    };
  }, [user?._id]);

  // ── Load chat ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;

    setLoading(true);
    api
      .get(`/chats/restaurant/${restaurantId}`)
      .then((r) => {
        // FIX: api.js uses fetch and returns parsed JSON directly
        // Backend returns { success: true, data: chatObject }
        // So r.data is the actual chat object
        const chatData = r?.data ?? r;
        setChat(chatData);

        const id = chatData?._id;
        if (id && socket) {
          chatIdRef.current = id;
          socket.emit("join_chat", { chatId: String(id) });
        }

        if ((chatData?.messages || []).length > 0) setShowQuickReplies(false);
      })
      .catch((err) => {
        console.error("Failed to load chat:", err);
        setSendError("Could not load chat. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  // Auto-scroll
  useEffect(() => {
    if (!isMinimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages, isTyping, isMinimized]);

  // Focus input
  useEffect(() => {
    if (!loading && !isMinimized) setTimeout(() => inputRef.current?.focus(), 150);
  }, [loading, isMinimized]);

  // Clear unread on un-minimize
  useEffect(() => {
    if (!isMinimized) setUnread(0);
  }, [isMinimized]);

  // ── Bot auto-reply ─────────────────────────────────────────────────────────
  const scheduleBotReply = useCallback(() => {
    clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      const botMsg = {
        _id: `bot-${Date.now()}`,
        sender: "vendor",
        text: BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)],
        createdAt: new Date().toISOString(),
        isBot: true,
      };
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setChat((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: [...(prev.messages || []), botMsg] };
        });
      }, 1500);
    }, BOT_AUTO_REPLY_DELAY);
  }, []);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideText) => {
      const msgText = (overrideText ?? text).trim();

      // FIX: better guards
      if (!msgText || !chat?._id || sending) return;

      setText("");
      setSending(true);
      setSendError(null);
      setShowQuickReplies(false);

      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId,
        sender: "customer",
        text: msgText,
        createdAt: new Date().toISOString(),
      };

      setChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), optimistic],
      }));

      scheduleBotReply();

      try {
        const res = await api.post(`/chats/${chat._id}/message`, {
          text: msgText,
        });

        // FIX: api.js (fetch-based) returns JSON directly from backend
        // Backend chatController returns { success: true, data: populatedChatObject }
        // So res.data is the full populated chat object
        const updatedChat = res?.data ?? res;

        if (updatedChat?.messages) {
          // Full populated chat returned — replace temp message cleanly
          setChat(updatedChat);
        } else {
          // Fallback: just confirm temp message as sent
          setChat((prev) => ({
            ...prev,
            messages: (prev.messages || []).map((m) =>
              m._id === tempId
                ? { ...m, _id: updatedChat?._id || tempId }
                : m
            ),
          }));
        }
      } catch (err) {
        console.error("Send message error:", err);
        // Rollback optimistic message and restore input
        setText(msgText);
        setSendError("Failed to send. Tap to retry.");
        setChat((prev) => ({
          ...prev,
          messages: (prev.messages || []).filter((m) => m._id !== tempId),
        }));
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [text, chat, sending, scheduleBotReply]
  );

  const handleQuickReply = useCallback(
    (replyText) => handleSend(replyText),
    [handleSend]
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const msgs = chat?.messages || [];
  const chatWidth = isExpanded ? 400 : 348;

  // ── Minimized bubble ───────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white relative"
        style={{ background: "linear-gradient(135deg, #ea580c, #c2410c)" }}
      >
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center border-2 border-white">
            {unread}
          </span>
        )}
      </motion.button>
    );
  }

  // ── Full chat UI ───────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden"
      style={{
        width: chatWidth,
        height: isExpanded ? 580 : 500,
        borderRadius: 20,
        background: "#f8f7f5",
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow:
          "0 32px 80px -16px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)",
        transition: "width 0.2s ease, height 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)" }}
      >
        <div className="h-9 w-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-sm font-black text-white shrink-0">
          {(restaurantName || "R")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm truncate leading-tight">
            {restaurantName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-orange-100 text-[10px] font-semibold">
              Typically replies in minutes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 text-xs transition-colors"
          >
            {isExpanded ? "⊡" : "⊞"}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 text-sm transition-colors"
          >
            −
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
            <div className="h-5 w-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            <p className="text-xs text-gray-400">Loading...</p>
          </div>
        ) : msgs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center pt-4 pb-2 gap-3"
          >
            <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shadow-sm">
              👋
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">
                Hi! How can we help?
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Ask us anything about your order, menu, or delivery.
              </p>
            </div>
          </motion.div>
        ) : (
          msgs.map((msg, i) => {
            const isMe = msg.sender === "customer";
            const isAdmin = msg.sender === "admin";
            const isSending = msg._id?.startsWith("temp-");
            const isBot = msg.isBot;
            const prevMsg = msgs[i - 1];
            const nextMsg = msgs[i + 1];
            const isFirst = !prevMsg || prevMsg.sender !== msg.sender;
            const isLast = !nextMsg || nextMsg.sender !== msg.sender;

            return (
              <motion.div
                key={msg._id || i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isFirst ? "mt-3" : "mt-0.5"}`}
              >
                {isFirst && !isMe && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px]">
                      {isAdmin ? "🛡️" : "🏪"}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                      {isAdmin
                        ? "Admin"
                        : isBot
                        ? `${restaurantName} · Auto-reply`
                        : restaurantName}
                    </span>
                  </div>
                )}

                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed break-words max-w-[80%] ${
                    isMe
                      ? `text-white shadow-sm ${isSending ? "opacity-60" : ""}`
                      : isAdmin
                      ? "bg-purple-50 text-purple-900 border border-purple-100 shadow-sm"
                      : isBot
                      ? "bg-orange-50 text-orange-900 border border-orange-200 shadow-sm"
                      : "bg-white text-gray-800 border border-gray-100 shadow-sm"
                  } ${
                    isMe
                      ? isFirst && isLast
                        ? "rounded-2xl rounded-tr-sm"
                        : isFirst
                        ? "rounded-2xl rounded-tr-sm rounded-br-md"
                        : isLast
                        ? "rounded-2xl rounded-tr-md rounded-br-sm"
                        : "rounded-2xl rounded-r-sm"
                      : isFirst && isLast
                      ? "rounded-2xl rounded-tl-sm"
                      : isFirst
                      ? "rounded-2xl rounded-tl-sm rounded-bl-md"
                      : isLast
                      ? "rounded-2xl rounded-tl-md rounded-bl-sm"
                      : "rounded-2xl rounded-l-sm"
                  }`}
                  style={
                    isMe
                      ? {
                          background:
                            "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                        }
                      : {}
                  }
                >
                  {msg.text}
                </div>

                {isLast && (
                  <div
                    className={`flex items-center gap-1 mt-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-[9px] text-gray-400">
                      {formatTime(msg.createdAt)}
                    </span>
                    {isSending && (
                      <span className="text-[9px] text-gray-400 animate-pulse">
                        Sending...
                      </span>
                    )}
                    {isMe && !isSending && (
                      <span className="text-[10px] text-orange-500">✓✓</span>
                    )}
                    {isBot && (
                      <span className="text-[9px] text-orange-400 font-medium">
                        · Auto-reply
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}

        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Quick Replies */}
      <AnimatePresence>
        {showQuickReplies && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-2 overflow-hidden"
          >
            <p className="text-[10px] text-gray-400 font-semibold mb-2 px-1">
              Quick questions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((qr) => (
                <motion.button
                  key={qr.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleQuickReply(qr.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-xs font-semibold hover:bg-orange-100 transition-colors"
                >
                  <span>{qr.icon}</span>
                  <span>{qr.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="shrink-0 px-3 py-2.5 border-t border-gray-100 bg-white">
        {sendError && (
          <p
            className="text-[10px] text-red-400 text-center mb-1.5 cursor-pointer hover:text-red-500"
            onClick={() => setSendError(null)}
          >
            ⚠️ {sendError}
          </p>
        )}
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all placeholder:text-gray-400 bg-gray-50 text-gray-800"
          />
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleSend()}
            disabled={sending || !text.trim()}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
            }}
          >
            {sending ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </motion.button>
        </div>
        <p className="text-[9px] text-gray-300 text-center mt-1.5">
          🍽️ NearBites · Messages are end-to-end private
        </p>
      </div>
    </motion.div>
  );
};

export default CustomerChat;
