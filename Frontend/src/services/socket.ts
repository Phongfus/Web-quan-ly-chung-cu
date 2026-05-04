import { io, Socket } from "socket.io-client";

const API_URL = process.env.UMI_APP_API_URL || "http://localhost:3001/api";
const BACKEND_URL = API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;
let listeners: Map<string, Set<Function>> = new Map();

// ================= INIT =================
export const initSocketClient = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem("token");

    socket = io(BACKEND_URL, {
      autoConnect: false,
      auth: { token },
      transports: ["websocket"],
      withCredentials: true,
    });

    setupEventListeners();

    // Debug
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket error:", error);
    });
  }

  return socket;
};

// ================= CONNECT =================
export const connectSocket = (userId: string) => {
  if (!socket) return;

  if (!socket.connected) {
    socket.connect();
  }

  // 🔥 QUAN TRỌNG: join user để nhận notification
  socket.emit("joinUser", userId);
};

// ================= DISCONNECT =================
export const disconnectSocketClient = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners.clear();
  }
};

// ================= EVENTS =================
const setupEventListeners = () => {
  if (!socket) return;

  // ===== MESSAGE =====
  socket.on("message:new", (message) => {
    emit("message:new", message);
  });

  socket.on("message:unread-count-updated", (data) => {
    emit("message:unread-count-updated", data);
  });

  socket.on("conversation:updated", (data) => {
    emit("conversation:updated", data);
  });

  // ===== NOTIFICATION =====
  socket.on("notification:new", (notification) => {
    console.log("🔔 Received notification:", notification);
    emit("notification:new", notification);
  });

  socket.on("notification:read", (data) => {
    emit("notification:read", data);
  });

  socket.on("notification:allread", (data) => {
    emit("notification:allread", data);
  });

  socket.on("notification:count-updated", (data) => {
    emit("notification:count-updated", data);
  });
};

// ================= LISTENER SYSTEM =================
export const on = (event: string, callback: Function) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)?.add(callback);

  return () => {
    listeners.get(event)?.delete(callback);
  };
};

const emit = (event: string, data: any) => {
  const callbacks = listeners.get(event);
  if (callbacks) {
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });
  }
};

// ================= CHAT =================
export const joinConversation = (conversationId: string) => {
  if (socket?.connected) {
    socket.emit("joinConversation", conversationId);
  }
};

export const leaveConversation = (conversationId: string) => {
  if (socket?.connected) {
    socket.emit("leaveConversation", conversationId);
  }
};

// ================= TOKEN REFRESH =================
export const reconnectSocketWithToken = () => {
  if (socket) {
    const token = localStorage.getItem("token");
    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }
  }
};