// server/socket-server.cjs
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.SOCKET_PORT || 4000;
const INTERNAL_TOKEN = process.env.SOCKET_INTERNAL_TOKEN || "dev-token";

const server = http.createServer(async (req, res) => {
    // Next/queueWorker-оос ирэх дотоод notify endpoint
    if (req.method === "POST" && req.url === "/internal/notify") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            try {
                const auth = req.headers.authorization || "";
                if (auth !== `Bearer ${INTERNAL_TOKEN}`) {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
                }

                const data = JSON.parse(body || "{}");
                const { userId, payload } = data;

                if (!userId || !payload) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ ok: false, error: "Missing userId/payload" }));
                }

                io.to(`user:${userId}`).emit("notification", payload);

                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(500, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ ok: false, error: e?.message || "Server error" }));
            }
        });
        return;
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
});

const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true,
    },
});

io.on("connection", (socket) => {
    console.log("🟢 socket connected:", socket.id);

    socket.on("join", ({ userId }) => {
        if (!userId) return;
        socket.join(`user:${userId}`);
        console.log(`👤 join room user:${userId}`);
    });

    socket.on("disconnect", () => {
        console.log("🔴 socket disconnected:", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`✅ Socket server running on http://localhost:${PORT}`);
});
