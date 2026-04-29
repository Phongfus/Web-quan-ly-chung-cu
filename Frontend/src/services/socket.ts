import { io, Socket } from "socket.io-client";

const API_URL = process.env.UMI_APP_API_URL || "http://localhost:3001/api";
const BACKEND_URL = API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export const initSocketClient = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem("token");

    socket = io(BACKEND_URL, {
      autoConnect: false,
      auth: { token },
      transports: ["websocket"],
      withCredentials: true,
    });
  }

  return socket;
};

export const disconnectSocketClient = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
