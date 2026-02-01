// server/socket-server.cjs
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET; // Next/Vercel-тэй ижил байх ёстой
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN.split(",").map((x) => x.trim()),
        credentials: true,
    },
});

// Auth middleware: client auth.token явуулна
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("NO_TOKEN"));

        const payload = jwt.verify(token, JWT_SECRET);
        socket.user = payload; // { sub/userId, role, ... }
        next();
    } catch (e) {
        next(new Error("BAD_TOKEN"));
    }
});

io.on("connection", (socket) => {
    const userId = socket.user?.userId || socket.user?.sub;
    if (!userId) {
        socket.disconnect(true);
        return;
    }

    // user room
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => { });
});

// HTTP endpoint: Next.js server энэ рүү POST хийнэ
server.on("request", async (req, res) => {
    if (req.method === "POST" && req.url === "/emit") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");

                // internal хамгаалалт
                if (req.headers["x-internal-token"] !== process.env.SOCKET_INTERNAL_TOKEN) {
                    res.writeHead(401);
                    return res.end("unauthorized");
                }

                const { userId, event, payload } = data;
                if (!userId || !event) {
                    res.writeHead(400);
                    return res.end("missing fields");
                }

                io.to(`user:${userId}`).emit(event, payload);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400);
                res.end("bad json");
            }
        });
        return;
    }

    res.writeHead(200);
    res.end("ok");
});

server.listen(PORT, () => console.log("socket server on", PORT));
