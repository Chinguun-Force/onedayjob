import { Server } from "socket.io";

export const runtime = "nodejs";



export async function GET(req: Request) {
  // Next.js route handler дээр "native" http server object байхгүй тул
  // Socket.io-г нэг удаа үүсгээд global дээр хадгална (demo-friendly pattern).
  if (!global._io) {
    global._io = new Server({
      path: "/api/socketio",
      cors: { origin: "*", methods: ["GET", "POST"] },
    });

    global._io.on("connection", (socket) => {
      // client -> join room
      socket.on("join", ({ userId }: { userId: string }) => {
        socket.join(`user:${userId}`);
      });

      socket.on("disconnect", () => {});
    });

    console.log("🟢 Socket.IO server started");
  }

  return new Response("ok");
}
