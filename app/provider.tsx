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

                // Notification
                s.off("notification:new"); // prevent duplicate listeners
                s.on("notification:new", (payload) => {
                    toast(payload?.title || "New notification", {
                        description: payload?.message || payload?.body || "",
                    });
                    window.dispatchEvent(new CustomEvent("notif:new", { detail: payload }));
                });

                // Announcement (шинэ)
                s.off("announcement:new");
                s.on("announcement:new", (payload) => {
                    toast("New announcement", { description: payload?.title || "" });
                    window.dispatchEvent(new CustomEvent("announce:new", { detail: payload }));
                    console.log("📢 announcement:new", payload);
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
