import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth.js";
import { api } from "../services/api.js";
import { SOCKET_URL } from "../config/runtime.js";

const normalizeLeaderboard = (rows = []) =>
  Array.isArray(rows)
    ? rows.map((row, index) => ({
        ...row,
        rank: row.rank || index + 1,
        score: row.score ?? row.totalScore ?? row.bestScore ?? 0,
      }))
    : [];

export const useGameScore = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [todayScore, setTodayScore] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const applyPayload = useCallback(
    (payload = {}) => {
      const rows = normalizeLeaderboard(payload.leaderboard || []);
      const mine =
        payload.currentUser ||
        rows.find((row) => String(row.userId) === String(user?._id)) ||
        null;

      setLeaderboard(rows.slice(0, 10));
      setCurrentUser(mine);
      if (mine) {
        setTodayScore(mine.score ?? mine.totalScore ?? 0);
        setMyRank(mine.rank || null);
      } else if (payload.todayScore !== undefined) {
        setTodayScore(Number(payload.todayScore) || 0);
        setMyRank(payload.myRank || null);
      }
    },
    [user?._id]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/games/my-score");
      applyPayload(response.data || {});
    } catch (apiError) {
      setError(apiError.message || "Could not load game score");
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    if (!user?._id) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { userId: String(user._id), role: user.role || "customer" });
      socket.emit("game:join", { userId: String(user._id) });
    });
    socket.on("leaderboard:update", applyPayload);

    return () => {
      socket.emit("game:leave");
      socket.off("leaderboard:update", applyPayload);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyPayload, user?._id, user?.role]);

  useEffect(() => {
    if (user?._id) refresh();
  }, [refresh, user?._id]);

  const addScore = useCallback(
    async (gameName, points) => {
      const response = await api.patch("/games/score", { gameName, points });
      const data = response.data || {};
      applyPayload(data);
      return data;
    },
    [applyPayload]
  );

  return useMemo(
    () => ({
      addScore,
      todayScore,
      myRank,
      leaderboard,
      currentUser,
      loading,
      error,
      refresh,
    }),
    [addScore, todayScore, myRank, leaderboard, currentUser, loading, error, refresh]
  );
};

export default useGameScore;
 




