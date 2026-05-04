import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server as IOServer } from "socket.io";
import app from "./app";
import { setSocketServer } from "./config/socket";
import { verifyToken } from "./utils/jwt";

const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8000";

const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: [FRONTEND_URL],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

setSocketServer(io);

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("Unauthorized"));
  }

  try {
    const decoded = verifyToken(token);
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user;
  if (user?.id) {
    socket.join(`user:${user.id}`);
  }

  socket.on("joinConversation", (conversationId: string) => {
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
    }
  });

  socket.on("leaveConversation", (conversationId: string) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });

  socket.on("joinUser", () => {
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }
  });

  socket.on("disconnect", () => {
    // cleanup if needed
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});