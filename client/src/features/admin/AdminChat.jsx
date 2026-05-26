import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { api } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

let adminSocket = null;

const formatTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const senderColor = (sender) => ({
  admin:    { bubble: "bg-purple-600 text-white", label: "🛡️ Admin (You)" },
  vendor:   { bubble: "bg-orange-500 text-white", label: "🏪 Vendor" },
  customer: { bubble: "bg-zinc-800 text-zinc-100 border border-zinc-700", label: "👤 Customer" },
}[sender] || { bubble: "bg-zinc-800 text-zinc-100", label: sender });

const AdminChat = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "restaurant" | "support"
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const loadChats = async () => {
    try {
      const res = await api.get("/chats/admin/all");
      setChats(res.data || []);
    } catch {
      toast.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 10000);

    adminSocket = io("http://localhost:5000", { withCredentials: true });
    adminSocket.emit("join", { userId: String(user._id), role: "admin" });

    adminSocket.on("new_message", ({ chatId, message }) => {
      setChats((prev) =>
        prev.map((c) =>
          String(c._id) === String(chatId)
            ? { ...c, messages: [...(c.messages || []), message], lastMessage: message.text }
            : c
        )
      );
      setSelected((prev) =>
        prev && String(prev._id) === String(chatId)
          ? { ...prev, messages: [...(prev.messages || []), message] }
          : prev
      );
    });

    adminSocket.on("message_received", ({ chatId, message }) => {
      setChats((prev) =>
        prev.map((c) =>
          String(c._id) === String(chatId)
            ? { ...c, messages: [...(c.messages || []), message], lastMessage: message.text }
            : c
        )
      );
      setSelected((prev) =>
        prev && String(prev._id) === String(chatId)
          ? { ...prev, messages: [...(prev.messages || []), message] }
          : prev
      );
    });

    return () => {
      clearInterval(interval);
      adminSocket?.disconnect();
      adminSocket = null;
    };
  }, [user._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  const selectChat = (chat) => {
    setSelected(chat);
    adminSocket?.emit("join_chat", { chatId: chat._id });
    api.patch(`/chats/${chat._id}/read`).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 100);
    // Update local unread
    setChats((prev) =>
      prev.map((c) => (c._id === chat._id ? { ...c, adminUnread: 0 } : c))
    );
  };

  const handleSend = async () => {
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const tempText = text.trim();
    setText("");

    // Optimistic
    const tempMsg = {
      _id: `temp-${Date.now()}`,
      sender: "admin",
      text: tempText,
      createdAt: new Date().toISOString(),
    };
    setSelected((prev) => ({ ...prev, messages: [...(prev.messages || []), tempMsg] }));

    try {
      await api.post(`/chats/admin/${selected._id}/message`, { text: tempText });
      await loadChats();
    } catch {
      toast.error("Failed to send");
      setText(tempText);
      setSelected((prev) => ({
        ...prev,
        messages: (prev.messages || []).filter((m) => m._id !== tempMsg._id),
      }));
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Filter + search
  const visibleChats = chats.filter((c) => {
    const matchType =
      filter === "all" ||
      (filter === "support" && c.chatType === "support") ||
      (filter === "restaurant" && c.chatType === "restaurant");

    const searchLower = search.toLowerCase();
    const matchSearch =
      !search ||
      (c.customer?.name || "").toLowerCase().includes(searchLower) ||
      (c.restaurant?.name || "").toLowerCase().includes(searchLower) ||
      (c.initiatedBy?.name || "").toLowerCase().includes(searchLower) ||
      (c.lastMessage || "").toLowerCase().includes(searchLower);

    return matchType && matchSearch;
  });

  const totalAdminUnread = chats.reduce((s, c) => s + (c.adminUnread || 0), 0);
  const flaggedCount = chats.reduce(
    (s, c) => s + (c.messages || []).filter((m) => m.flagged).length,
    0
  );

  return (
    <div
      className="grid gap-0 overflow-hidden rounded-2xl border border-zinc-800"
      style={{
        gridTemplateColumns: "300px 1fr",
        height: "calc(100vh - 180px)",
        minHeight: 560,
        background: "#08080a",
      }}
    >
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <div className="flex flex-col border-r border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-zinc-800 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div>
                <p className="text-sm font-black text-white">Admin Chats</p>
                <p className="text-[10px] text-zinc-500">{chats.length} conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalAdminUnread > 0 && (
                <span className="h-5 px-2 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center">
                  {totalAdminUnread}
                </span>
              )}
              {flaggedCount > 0 && (
                <span title="Flagged messages" className="h-5 px-2 rounded-full bg-amber-500 text-[10px] font-black text-white flex items-center gap-1">
                  ⚠️ {flaggedCount}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
          />

          {/* Filter tabs */}
          <div className="flex gap-1">
            {[
              { id: "all", label: "All" },
              { id: "restaurant", label: "🍽️ Orders" },
              { id: "support", label: "🆘 Support" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  filter === f.id
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            </div>
          ) : visibleChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-2xl mb-2">📭</span>
              <p className="text-xs text-zinc-500">No conversations</p>
            </div>
          ) : (
            visibleChats.map((chat) => {
              const isSelected = selected?._id === chat._id;
              const isSupport = chat.chatType === "support";
              const name = isSupport
                ? chat.initiatedBy?.name || "User"
                : chat.customer?.name || "Customer";
              const sub = isSupport
                ? `${chat.initiatedByRole || "user"} · support`
                : chat.restaurant?.name || "Restaurant";
              const unread = chat.adminUnread || 0;
              const hasFlagged = (chat.messages || []).some((m) => m.flagged);

              return (
                <motion.button
                  key={chat._id}
                  onClick={() => selectChat(chat)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "border-transparent hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black text-white ${
                          isSupport
                            ? "bg-gradient-to-br from-rose-500 to-pink-600"
                            : "bg-gradient-to-br from-purple-600 to-indigo-600"
                        }`}
                      >
                        {isSupport ? "🆘" : name[0]?.toUpperCase()}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center border-2 border-[#08080a]">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-bold truncate ${unread > 0 ? "text-white" : "text-zinc-300"}`}>
                          {name}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasFlagged && <span className="text-[10px]" title="Contains flagged content">⚠️</span>}
                          {isSupport && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold">
                              SUPPORT
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 truncate">{sub}</p>
                      <p className={`text-[11px] truncate mt-0.5 ${unread > 0 ? "text-zinc-400 font-semibold" : "text-zinc-600"}`}>
                        {chat.lastMessage || "No messages"}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat window ───────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden bg-[#08080a]">
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center select-none"
            >
              <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl mb-4">
                🛡️
              </div>
              <p className="text-base font-black text-zinc-300">Admin Chat Center</p>
              <p className="text-xs text-zinc-600 mt-2 max-w-xs leading-relaxed">
                Select a conversation to view messages, reply, or monitor flagged content.
              </p>
              {flaggedCount > 0 && (
                <div className="mt-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  ⚠️ {flaggedCount} flagged message{flaggedCount > 1 ? "s" : ""} need attention
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={selected._id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col h-full"
            >
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-zinc-800 shrink-0 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0 ${
                  selected.chatType === "support"
                    ? "bg-gradient-to-br from-rose-500 to-pink-600"
                    : "bg-gradient-to-br from-purple-600 to-indigo-600"
                }`}>
                  {selected.chatType === "support" ? "🆘" : (selected.customer?.name || "C")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {selected.chatType === "support" ? (
                    <>
                      <p className="text-sm font-black text-white">
                        {selected.initiatedBy?.name || "User"} — Support Chat
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {selected.initiatedByRole} · {selected.initiatedBy?.email}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-black text-white">
                        {selected.customer?.name || "Customer"} ↔ {selected.restaurant?.name || "Restaurant"}
                      </p>
                      <p className="text-[10px] text-zinc-500">{selected.customer?.email}</p>
                    </>
                  )}
                </div>
                {/* Flagged warning */}
                {(selected.messages || []).some((m) => m.flagged) && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                    ⚠️ Contains flagged content
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                {(selected.messages || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40">
                    <span className="text-3xl mb-2">💬</span>
                    <p className="text-xs text-zinc-500">No messages yet</p>
                  </div>
                ) : (
                  (() => {
                    const msgs = selected.messages || [];
                    return msgs.map((msg, i) => {
                      const isAdmin = msg.sender === "admin";
                      const { bubble, label } = senderColor(msg.sender);
                      const isSending = msg._id?.startsWith("temp-");
                      const prevMsg = msgs[i - 1];
                      const nextMsg = msgs[i + 1];
                      const isFirst = !prevMsg || prevMsg.sender !== msg.sender;
                      const isLast = !nextMsg || nextMsg.sender !== msg.sender;

                      return (
                        <div
                          key={msg._id || i}
                          className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} ${isFirst ? "mt-3" : "mt-0.5"}`}
                        >
                          {isFirst && (
                            <span className="text-[10px] font-bold text-zinc-600 mb-1 px-1">
                              {label}
                            </span>
                          )}
                          <div
                            className={`px-3.5 py-2.5 text-sm leading-relaxed break-words max-w-[72%] ${bubble} ${
                              isSending ? "opacity-50" : ""
                            } ${
                              msg.flagged
                                ? "ring-2 ring-amber-500/50"
                                : ""
                            } ${
                              isAdmin
                                ? isFirst && isLast ? "rounded-2xl rounded-tr-md"
                                  : isFirst ? "rounded-2xl rounded-tr-md rounded-br-sm"
                                  : isLast ? "rounded-2xl rounded-tr-sm rounded-br-md"
                                  : "rounded-2xl rounded-r-sm"
                                : isFirst && isLast ? "rounded-2xl rounded-tl-md"
                                  : isFirst ? "rounded-2xl rounded-tl-md rounded-bl-sm"
                                  : isLast ? "rounded-2xl rounded-tl-sm rounded-bl-md"
                                  : "rounded-2xl rounded-l-sm"
                            }`}
                          >
                            {msg.text}
                            {msg.flagged && (
                              <span className="ml-2 text-[9px] text-amber-300 font-bold">⚠️ filtered</span>
                            )}
                          </div>
                          {isLast && (
                            <div className={`flex items-center gap-1 mt-1 px-1 ${isAdmin ? "flex-row-reverse" : ""}`}>
                              <span className="text-[9px] text-zinc-700">{formatTime(msg.createdAt)}</span>
                              {isSending && <span className="text-[9px] text-zinc-600 animate-pulse">Sending...</span>}
                              {isAdmin && !isSending && <span className="text-[10px] text-purple-500">✓</span>}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-zinc-800 bg-[#0c0c0e] shrink-0">
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Reply as admin..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500/40 transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                  >
                    {sending ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <>Send <span>🛡️</span></>
                    )}
                  </motion.button>
                </div>
                <p className="text-[10px] text-zinc-700 mt-1.5 text-right">
                  Replying as <span className="text-zinc-500">Admin</span> · Enter to send
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminChat;
