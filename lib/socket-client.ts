"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let initializing: Promise<Socket> | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  if (initializing) return initializing;

  initializing = (async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_SOCKET_URL is missing");
    }

    // 1) get token
    const res = await fetch("/api/socket-token", { cache: "no-store" });
    const data = await res.json();

    console.log("socket-token:", res.status, data);

    if (!res.ok || !data?.token) {
      throw new Error("Cannot get socket token");
    }

    // 2) connect
    const s = io(baseUrl, {
      auth: { token: data.token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });

    // ✅ Always log errors
    s.on("connect", () => console.log("✅ socket connected", s.id));
    s.on("connect_error", (err) => console.log("❌ connect_error", err?.message || err));
    s.on("disconnect", (reason) => console.log("⚠️ socket disconnected", reason));
    s.on("error", (err) => console.log("❌ socket error", err));

    socket = s;
    return s;
  })();

  try {
    return await initializing;
  } finally {
    initializing = null;
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
