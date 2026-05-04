import { Server as IOServer } from "socket.io";

let io: IOServer | null = null;

export const setSocketServer = (server: IOServer) => {
  io = server;

  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // 🔥 QUAN TRỌNG NHẤT
    socket.on("joinUser", (userId: string) => {
      socket.join(userId);
      console.log("👤 User joined room:", userId);
    });

    // chat
    socket.on("joinConversation", (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on("leaveConversation", (conversationId: string) => {
      socket.leave(conversationId);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });
};

export const getSocketServer = () => io;