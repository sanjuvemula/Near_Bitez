import { Server } from "socket.io";

// ─── In-memory Social State ───────────────────────────────────────────────────
const socialState = {
  cravings: {},
  stories: [],
  liveOrders: [],
  onlineUsers: new Map(),
  waitingQueues: { random: [], group: [], together: [] },
  activeRooms: new Map(),
  groupVotes: new Map(),
};

// ─── Game State ───────────────────────────────────────────────────────────────
// areaKey → [{ userId, name, score, gamesPlayed, lastPlayed, lat, lng }]
const areaGameBoards = new Map();
// global records: gameId → { userId, name, score, achievedAt }
const globalGameRecords = new Map();
// reward tracking: userId → { topRankStart, rewardGranted }
const rewardTracking = new Map();

const getAreaKey = (lat, lng, radiusKm = 2) => {
  const grid = radiusKm / 111;
  const roundedLat = Math.round(lat / grid) * grid;
  const roundedLng = Math.round(lng / grid) * grid;
  return `${roundedLat.toFixed(4)}_${roundedLng.toFixed(4)}`;
};

// ─── Bad words filter ─────────────────────────────────────────────────────────
const BAD_WORDS = ["spam", "abuse", "hate", "kill", "fuck", "shit", "bitch", "ass", "dick", "sex", "porn", "nude", "naked"];
const isToxic = (text) => BAD_WORDS.some((w) => text.toLowerCase().includes(w));
const sanitize = (text) => {
  let clean = text;
  BAD_WORDS.forEach((w) => { clean = clean.replace(new RegExp(w, "gi"), "*".repeat(w.length)); });
  return clean.slice(0, 500);
};

const ADJ = ["Happy","Hungry","Spicy","Salty","Sweet","Crispy","Fluffy","Zesty","Bold","Fresh"];
const NOUNS = ["Foodie","Muncher","Snacker","Chomper","Nibbler","Biter","Taster","Eater","Chef","Diner"];
const anonName = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
const genRoomId = () => `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
    pingTimeout: 60000,
  });

  const broadcastOnlineCount = () => {
    io.emit("fc_online_count", socialState.onlineUsers.size);
  };

  io.on("connection", (socket) => {

    // ──────────────────── CORE JOIN ────────────────────────────────────────────
    socket.on("join", ({ userId, role }) => {
      if (userId && role) {
        socket.join(`${role}_${userId}`);
        socket.data.userId = userId;
        socket.data.role = role;
      }
    });

    socket.on("game:join", ({ userId } = {}) => {
      socket.join("games:today");
      if (userId) {
        socket.join(`customer_${userId}`);
        socket.data.gameUserId = userId;
      }
    });

    socket.on("game:leave", () => {
      socket.leave("games:today");
    });

    socket.on("join_chat", ({ chatId }) => { if (chatId) socket.join(`chat_${chatId}`); });
    socket.on("leave_chat", ({ chatId }) => { if (chatId) socket.leave(`chat_${chatId}`); });

    socket.on("join_social", ({ userId, slot }) => {
      socket.data.socialUserId = userId;
      socket.data.slot = slot;
      socialState.onlineUsers.set(socket.id, { userId, slot });
      broadcastOnlineCount();
    });

    // ──────────────────── TIFFIN REAL-TIME ────────────────────────────────────
    // Customers call this when they open the TiffinPage to receive live updates
    socket.on("join_tiffin", () => {
      socket.join("tiffin_subscribers");
      socket.data.tiffinSubscriber = true;
    });

    // Customers call this when they leave the TiffinPage
    socket.on("leave_tiffin", () => {
      socket.leave("tiffin_subscribers");
      socket.data.tiffinSubscriber = false;
    });

    // ──────────────────── GAME LEADERBOARD SYSTEM ─────────────────────────────

    // Join a game area (call this when game zone opens)
    socket.on("game_join_area", ({ userId, name, lat, lng }) => {
      socket.data.gameUserId = userId;
      socket.data.gameName = name;
      socket.data.gameLat = lat;
      socket.data.gameLng = lng;

      if (lat && lng) {
        const areaKey = getAreaKey(lat, lng);
        socket.join(`game_area_${areaKey}`);
        socket.data.gameAreaKey = areaKey;
      }
    });

    // Submit a game score — updates area leaderboard in real-time
    socket.on("submit_game_score", ({ userId, name, score, gameId, lat, lng }) => {
      if (!userId || score == null) return;

      const effectiveLat = lat || socket.data.gameLat;
      const effectiveLng = lng || socket.data.gameLng;
      const effectiveName = name || socket.data.gameName || "Foodie";
      const effectiveGameId = gameId || "general";

      // ── Update area board ──────────────────────────────────────────────────
      if (effectiveLat && effectiveLng) {
        const areaKey = getAreaKey(effectiveLat, effectiveLng);
        if (!areaGameBoards.has(areaKey)) areaGameBoards.set(areaKey, []);
        const board = areaGameBoards.get(areaKey);

        const existing = board.find((e) => e.userId === String(userId));
        if (existing) {
          existing.score += score;
          existing.gamesPlayed = (existing.gamesPlayed || 0) + 1;
          existing.lastPlayed = Date.now();
        } else {
          board.push({
            userId: String(userId),
            name: effectiveName,
            score,
            gamesPlayed: 1,
            lastPlayed: Date.now(),
            lat: effectiveLat,
            lng: effectiveLng,
          });
        }

        board.sort((a, b) => b.score - a.score);
        areaGameBoards.set(areaKey, board.slice(0, 50));

        // Broadcast updated leaderboard to everyone in this area
        const freshBoard = board.slice(0, 10);
        io.to(`game_area_${areaKey}`).emit("game_leaderboard", freshBoard);

        // ── Check 7-hour top-3 reward ────────────────────────────────────────
        const rank = board.findIndex((e) => e.userId === String(userId)) + 1;
        const trackKey = `${userId}_${areaKey}`;

        if (rank <= 3) {
          if (!rewardTracking.has(trackKey)) {
            rewardTracking.set(trackKey, { topRankStart: Date.now(), rewardGranted: false });
          }
          const tracking = rewardTracking.get(trackKey);
          const hoursInTop = (Date.now() - tracking.topRankStart) / (1000 * 60 * 60);

          if (hoursInTop >= 7 && !tracking.rewardGranted) {
            tracking.rewardGranted = true;
            // Notify the player
            socket.emit("game_reward", {
              type: "TOP_PLAYER_7H",
              title: "🏆 7-Hour Champion!",
              message: "You've been in the Top 3 for 7 hours straight! Here's a 15% discount!",
              discountCode: `TOP7H${String(userId).slice(-4).toUpperCase()}`,
              discountPercent: 15,
            });
            // Announce to area
            io.to(`game_area_${areaKey}`).emit("game_announcement", {
              message: `🏆 ${effectiveName} has been dominating the leaderboard for 7 hours!`,
              type: "champion",
            });
          }
        } else {
          // Reset if they fall out of top 3
          if (rewardTracking.has(trackKey)) {
            rewardTracking.get(trackKey).topRankStart = Date.now();
            rewardTracking.get(trackKey).rewardGranted = false;
          }
        }
      }

      // ── Check global record ────────────────────────────────────────────────
      if (effectiveGameId && effectiveGameId !== "general") {
        const currentRecord = globalGameRecords.get(effectiveGameId);
        if (!currentRecord || score > currentRecord.score) {
          const oldRecord = currentRecord ? { ...currentRecord } : null;
          globalGameRecords.set(effectiveGameId, {
            userId: String(userId),
            name: effectiveName,
            score,
            achievedAt: new Date().toISOString(),
          });

          // Notify the record breaker
          socket.emit("game_reward", {
            type: "GLOBAL_RECORD",
            title: "🌟 New Global Record!",
            message: `You broke the ${effectiveGameId} record${oldRecord ? ` (was ${oldRecord.score} by ${oldRecord.name})` : ""}! Enjoy a special 10% discount!`,
            discountCode: `REC${effectiveGameId.slice(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`,
            discountPercent: 10,
          });

          // Broadcast to all connected players
          io.emit("game_global_record", {
            gameId: effectiveGameId,
            playerName: effectiveName,
            score,
            message: `🌟 ${effectiveName} just set a new ${effectiveGameId} record with ${score} points!`,
          });
        }
      }
    });

    // Request current area leaderboard
    socket.on("get_game_leaderboard", ({ lat, lng } = {}) => {
      const effectiveLat = lat || socket.data.gameLat;
      const effectiveLng = lng || socket.data.gameLng;

      if (effectiveLat && effectiveLng) {
        const areaKey = getAreaKey(effectiveLat, effectiveLng);
        const board = areaGameBoards.get(areaKey) || [];
        // Filter last 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const fresh = board.filter((e) => e.lastPlayed > cutoff).slice(0, 10);
        socket.emit("game_leaderboard", fresh);
      } else {
        // Merge all area boards and return global top 10
        const all = [];
        const seen = new Set();
        for (const board of areaGameBoards.values()) {
          for (const e of board) {
            if (!seen.has(e.userId)) {
              seen.add(e.userId);
              all.push(e);
            }
          }
        }
        all.sort((a, b) => b.score - a.score);
        socket.emit("game_leaderboard", all.slice(0, 10));
      }
    });

    // Request global records
    socket.on("get_game_records", () => {
      const records = {};
      for (const [gameId, record] of globalGameRecords) {
        records[gameId] = record;
      }
      socket.emit("game_records", records);
    });

    // ──────────────────── CRAVING RADAR ───────────────────────────────────────
    socket.on("get_cravings", () => {
      const list = Object.entries(socialState.cravings)
        .map(([item, d]) => ({ item, count: d.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      socket.emit("initial_cravings", list);
    });

    socket.on("set_craving", ({ item }) => {
      if (!item || typeof item !== "string") return;
      const clean = sanitize(item.trim()).slice(0, 40);
      if (!clean || isToxic(clean)) return;

      const key = clean.toLowerCase();
      if (!socialState.cravings[key]) {
        socialState.cravings[key] = { count: 0, users: new Set(), displayName: clean };
      }
      const uid = socket.data.socialUserId || socket.id;
      if (socialState.cravings[key].users.has(uid)) return;
      socialState.cravings[key].users.add(uid);
      socialState.cravings[key].count++;

      io.emit("craving_update", {
        item: socialState.cravings[key].displayName,
        count: socialState.cravings[key].count,
      });

      const entries = Object.entries(socialState.cravings);
      if (entries.length > 20) {
        const sorted = entries.sort((a, b) => a[1].count - b[1].count);
        delete socialState.cravings[sorted[0][0]];
      }
    });

    // ──────────────────── FOOD STORIES ────────────────────────────────────────
    socket.on("get_stories", () => {
      socket.emit("initial_stories", socialState.stories.slice(0, 20));
    });

    socket.on("post_story", ({ text, userName, userId }) => {
      if (!text || typeof text !== "string") return;
      const clean = sanitize(text.trim()).slice(0, 200);
      if (!clean || isToxic(clean)) {
        socket.emit("story_rejected", { reason: "Content not allowed" });
        return;
      }
      const story = {
        id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: clean,
        userName: (userName || "Anonymous").slice(0, 20),
        userId: userId || null,
        createdAt: new Date().toISOString(),
      };
      socialState.stories.unshift(story);
      socialState.stories = socialState.stories.slice(0, 50);
      io.emit("new_food_story", story);
    });

    // ──────────────────── LIVE EATING MODE ────────────────────────────────────
    socket.on("get_live_orders", () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const recent = socialState.liveOrders.filter((o) => new Date(o.time).getTime() > twoHoursAgo);
      socket.emit("initial_live_orders", recent.slice(0, 10));
    });

    socket.on("share_live_order", ({ item, userName, userId }) => {
      if (!item || typeof item !== "string") return;
      const clean = sanitize(item.trim()).slice(0, 60);
      if (!clean || isToxic(clean)) return;
      const order = {
        id: `lo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        item: clean,
        userName: (userName || "Someone").slice(0, 20),
        userId: userId || null,
        time: new Date().toISOString(),
      };
      socialState.liveOrders.unshift(order);
      socialState.liveOrders = socialState.liveOrders.slice(0, 30);
      io.emit("live_order_update", socialState.liveOrders.slice(0, 10));
    });

    // ──────────────────── FOOD CONNECT ────────────────────────────────────────
    socket.on("fc_join", ({ mode, userId, slot }) => {
      socket.data.fcMode = mode;
      socket.data.fcName = anonName();

      if (mode === "group") {
        let groupRoom = null;
        for (const [roomId, room] of socialState.activeRooms) {
          if (room.mode === "group" && room.members.length < 8) { groupRoom = { roomId, room }; break; }
        }
        if (!groupRoom) {
          const roomId = genRoomId();
          socialState.activeRooms.set(roomId, { mode: "group", members: [socket.id], votes: {}, createdAt: Date.now() });
          socket.join(`fc_${roomId}`);
          socket.data.fcRoomId = roomId;
          socket.emit("fc_group_joined", { roomId, memberCount: 1 });
        } else {
          const { roomId, room } = groupRoom;
          room.members.push(socket.id);
          socket.join(`fc_${roomId}`);
          socket.data.fcRoomId = roomId;
          socket.emit("fc_group_joined", { roomId, memberCount: room.members.length });
          io.to(`fc_${roomId}`).emit("fc_member_joined", { count: room.members.length });
          socket.emit("fc_vote_update", room.votes);
        }
        return;
      }

      const queue = socialState.waitingQueues[mode] || [];
      const waiting = queue.find((w) => w.socketId !== socket.id && w.slot === slot);

      if (waiting) {
        const idx = queue.indexOf(waiting);
        queue.splice(idx, 1);
        socialState.waitingQueues[mode] = queue;
        const roomId = genRoomId();
        socialState.activeRooms.set(roomId, { mode, members: [socket.id, waiting.socketId], votes: {}, createdAt: Date.now() });
        socket.join(`fc_${roomId}`);
        io.sockets.sockets.get(waiting.socketId)?.join(`fc_${roomId}`);
        socket.data.fcRoomId = roomId;
        if (io.sockets.sockets.get(waiting.socketId)) io.sockets.sockets.get(waiting.socketId).data.fcRoomId = roomId;
        socket.emit("fc_matched", { roomId, peerName: waiting.anonName });
        io.to(waiting.socketId).emit("fc_matched", { roomId, peerName: socket.data.fcName });
      } else {
        socialState.waitingQueues[mode] = [...(socialState.waitingQueues[mode] || []), { socketId: socket.id, userId, slot, anonName: socket.data.fcName }];
        socket.emit("fc_waiting");
      }
    });

    socket.on("fc_message", ({ roomId, text }) => {
      if (!text || typeof text !== "string") return;
      const clean = sanitize(text.trim());
      if (!clean) return;
      if (isToxic(text)) { socket.emit("fc_warning", { message: "⚠️ Message filtered: Keep it food-related!" }); return; }
      io.to(`fc_${roomId}`).except(socket.id).emit("fc_message", { text: clean, senderName: socket.data.fcName || "Anonymous", createdAt: new Date().toISOString() });
    });

    socket.on("fc_vote", ({ roomId, food }) => {
      const room = socialState.activeRooms.get(roomId);
      if (!room || room.mode !== "group") return;
      room.votes[food] = (room.votes[food] || 0) + 1;
      io.to(`fc_${roomId}`).emit("fc_vote_update", room.votes);
    });

    socket.on("fc_leave", () => {
      const roomId = socket.data.fcRoomId;
      if (roomId) {
        socket.to(`fc_${roomId}`).emit("fc_peer_left");
        socket.leave(`fc_${roomId}`);
        const room = socialState.activeRooms.get(roomId);
        if (room) { room.members = room.members.filter((id) => id !== socket.id); if (room.members.length === 0) socialState.activeRooms.delete(roomId); }
        socket.data.fcRoomId = null;
      }
      Object.keys(socialState.waitingQueues).forEach((mode) => {
        socialState.waitingQueues[mode] = socialState.waitingQueues[mode].filter((w) => w.socketId !== socket.id);
      });
    });

    // ──────────────────── DISCONNECT ──────────────────────────────────────────
    socket.on("disconnect", () => {
      const roomId = socket.data.fcRoomId;
      if (roomId) {
        socket.to(`fc_${roomId}`).emit("fc_peer_left");
        const room = socialState.activeRooms.get(roomId);
        if (room) { room.members = room.members.filter((id) => id !== socket.id); if (room.members.length === 0) socialState.activeRooms.delete(roomId); }
      }
      Object.keys(socialState.waitingQueues).forEach((mode) => {
        socialState.waitingQueues[mode] = socialState.waitingQueues[mode].filter((w) => w.socketId !== socket.id);
      });
      // Remove from game area
      if (socket.data.gameAreaKey) {
        socket.leave(`game_area_${socket.data.gameAreaKey}`);
      }
      socket.leave("games:today");
      // Leave tiffin room
      if (socket.data.tiffinSubscriber) {
        socket.leave("tiffin_subscribers");
      }
      socialState.onlineUsers.delete(socket.id);
      broadcastOnlineCount();
    });

    socket.on("fc_report", ({ roomId, reason }) => {
      console.log(`[FoodConnect Report] Room: ${roomId} | Reason: ${reason}`);
      socket.emit("fc_report_received", { message: "Report submitted. Our team will review it. 🙏" });
    });

    socket.emit("fc_online_count", socialState.onlineUsers.size);
  });

  // ── Cleanup every 30 mins ─────────────────────────────────────────────────
  setInterval(() => {
    const now = Date.now();

    // Clean old FC rooms
    for (const [roomId, room] of socialState.activeRooms) {
      if (now - room.createdAt > 2 * 60 * 60 * 1000) socialState.activeRooms.delete(roomId);
    }

    // Reset cravings every 4 hours
    if (now % (4 * 60 * 60 * 1000) < 30 * 60 * 1000) socialState.cravings = {};

    // Clear old live orders & stories
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    socialState.liveOrders = socialState.liveOrders.filter((o) => new Date(o.time).getTime() > twoHoursAgo);
    socialState.stories = socialState.stories.filter((s) => new Date(s.createdAt).getTime() > oneDayAgo);

    // Clean old game board entries (> 24h)
    for (const [key, board] of areaGameBoards) {
      const fresh = board.filter((e) => e.lastPlayed > oneDayAgo);
      if (fresh.length === 0) areaGameBoards.delete(key);
      else areaGameBoards.set(key, fresh);
    }

    // Reset reward tracking daily
    for (const [key, tracking] of rewardTracking) {
      if (tracking.rewardGranted && now - tracking.topRankStart > 24 * 60 * 60 * 1000) {
        rewardTracking.delete(key);
      }
    }
  }, 30 * 60 * 1000);

  return io;
};
