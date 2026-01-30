import type { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse["socket"] & {
    server: any & { io?: IOServer };
  };
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      socket.on("join", ({ userId }: { userId: string }) => {
        socket.join(`user:${userId}`);
      });
    });

    res.socket.server.io = io;
    console.log("🟢 Socket.IO started");
  }

  res.end();
}
