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
        let isMounted = true;

        async function initializeSocket() {
            try {
                const socket = await getSocket();
                if (!isMounted) return;

                // Notification handler
                socket.off("notification:new");
                socket.on("notification:new", (payload) => {
                    toast(payload?.title || "Notification", {
                        description: payload?.message || payload?.body || "",
                    });
                    window.dispatchEvent(new CustomEvent("notif:new", { detail: payload }));
                });

                // Announcement handler
                socket.off("announcement:new");
                socket.on("announcement:new", (payload) => {
                    toast("Announcement", {
                        description: payload?.title || "",
                    });
                    window.dispatchEvent(new CustomEvent("announce:new", { detail: payload }));
                });
            } catch (error) {
                // Silently handle connection errors
            }
        }

        initializeSocket();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <ApolloProvider client={client}>
            <SessionProvider>{children}</SessionProvider>
        </ApolloProvider>
    );
}
