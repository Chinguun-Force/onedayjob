"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocketNotifications(
  userId: string | undefined,
  onMessage: (payload: any) => void
) {
  useEffect(() => {
    if (!userId) return;

    if (!socket) {
      socket = io("http://localhost:3000", {
        path: "/api/socket",
      });
    }

    socket.emit("join", { userId });

    const handler = (payload: any) => {
      onMessage(payload);
    };

    socket.on("notification", handler);

    return () => {
      socket?.off("notification", handler);
    };
  }, [userId, onMessage]);
}
