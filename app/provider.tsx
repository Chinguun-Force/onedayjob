"use client";

import { SessionProvider } from "next-auth/react";
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import { toast } from "sonner";

const client = new ApolloClient({
    uri: "/api/graphql",
    cache: new InMemoryCache(),
});
export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const s = await getSocket();
                if (!active) return;

                s.on("connect", () => console.log("socket connected"));
                s.on("disconnect", () => console.log("socket disconnected"));

                // шинэ notification ирэхэд
                s.on("notification:new", (payload) => {
                    // payload: { title, message, type, ... }
                    toast(payload?.title || "New notification", {
                        description: payload?.message || payload?.body || "",
                    });

                    // хүсвэл global event dispatch хийгээд badge update хийж болно
                    window.dispatchEvent(new CustomEvent("notif:new", { detail: payload }));
                });
            } catch (e) {
                console.log("socket init failed", e);
            }
        })();

        return () => {
            active = false;
        };
    }, []);
    return (
        <ApolloProvider client={client}>
            <SessionProvider>{children}</SessionProvider>
        </ApolloProvider>
    );
}
