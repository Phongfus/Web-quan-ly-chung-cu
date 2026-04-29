import { Server as IOServer } from "socket.io";

let io: IOServer | null = null;

export const setSocketServer = (server: IOServer) => {
  io = server;
};

export const getSocketServer = () => io;
