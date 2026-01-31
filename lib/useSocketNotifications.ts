"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocketNotifications(
  userId: string | undefined,
  onMessage: (payload: any) => void
) {
  useEffect(() => {
    if (!userId) return;

    if (!socket) {
      socket = io("http://localhost:4000", {
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("🟢 socket connected", socket?.id);
      });

      socket.on("connect_error", (err) => {
        console.log("🔴 socket connect_error", err?.message || err);
      });

      socket.on("disconnect", (reason) => {
        console.log("🟠 socket disconnected", reason);
      });
    }

    // room join
    socket.emit("join", { userId });

    const handler = (payload: any) => {
      console.log("🔔 notification received", payload);
      onMessage(payload);
    };

    socket.on("notification", handler);

    return () => {
      socket?.off("notification", handler);
    };
  }, [userId, onMessage]);
}
