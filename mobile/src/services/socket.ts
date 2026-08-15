import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/constants/config";
import { getToken } from "@/services/storage";

/**
 * One Socket.IO connection for the whole app.
 *
 * Screens subscribe through `useSocketEvent`; they never call `connect()`
 * themselves. A single socket keeps the server's room bookkeeping correct and
 * avoids draining the battery with duplicate connections.
 */

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  if (socket) {
    socket.connect();
    return socket;
  }

  const token = await getToken();

  socket = io(SOCKET_URL, {
    // RN has no persistent cookie jar, so the handshake carries the JWT the
    // same way HTTP requests do.
    auth: token ? { token } : undefined,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    // Skip the HTTP long-poll upgrade dance; websockets work directly in RN.
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
    autoConnect: true,
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};

/** Re-establishes the connection with a new identity after login/logout. */
export const reconnectSocket = async (): Promise<Socket> => {
  disconnectSocket();
  return connectSocket();
};

export const emit = (event: string, payload?: unknown): void => {
  socket?.emit(event, payload);
};

/**
 * Event names exactly as the server emits them
 * (server/controllers/orderController.js and vendor/orderController.js).
 */
export const SOCKET_EVENTS = {
  /** Vendor moved the order along; payload carries the new status. */
  orderStatusUpdate: "order_status_update",
  orderOutForDelivery: "order:out_for_delivery",
  /** Generic notification pushed to the user's room. */
  notification: "notification",
  newOrder: "new_order",
  newMessage: "new_message",
  messageReceived: "message_received",
  leaderboardUpdate: "leaderboard:update",
} as const;

/**
 * Join the personal room the server addresses.
 *
 * server/config/socket.js listens for `join` and puts the socket into
 * `${role}_${userId}` — without this, order and notification events never
 * reach the device.
 */
export const joinUserRoom = async (userId: string, role: string): Promise<void> => {
  const active = socket?.connected ? socket : await connectSocket();

  const send = () => active.emit("join", { userId, role });

  if (active.connected) send();
  else active.once("connect", send);

  // Rooms are lost on the server when a socket drops, so re-join every time
  // the transport comes back.
  active.on("connect", send);
};
