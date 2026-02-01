"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

/**
 * Initializes and returns a singleton socket instance
 */
export async function getSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

    if (!socketUrl) {
      throw new Error("Socket URL is not configured");
    }

    const response = await fetch("/api/socket-token", { cache: "no-store" });
    const { token } = await response.json();

    if (!response.ok || !token) {
      throw new Error("Failed to retrieve socket authentication token");
    }

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });

    newSocket.on("connect", () => {
      console.log("Socket connection established");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message || error);
    });

    socket = newSocket;
    return newSocket;
  })();

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
