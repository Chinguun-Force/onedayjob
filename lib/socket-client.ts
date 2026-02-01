"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;

  const res = await fetch("/api/socket-token");
  if (!res.ok) throw new Error("Cannot get socket token");
  const { token } = await res.json();

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    auth: { token },
    transports: ["websocket"],
  });

  return socket;
}
