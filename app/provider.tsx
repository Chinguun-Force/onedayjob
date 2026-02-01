"use client";

import { SessionProvider } from "next-auth/react";
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import { toast } from "sonner";
import AppNav from "@/components/app-nav";

const client = new ApolloClient({
    uri: "/api/graphql",
    cache: new InMemoryCache(),
});

function InnerProviders({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        let isMounted = true;

        async function initializeSocket() {
            try {
                const socket = await getSocket();
                if (!isMounted) return;

                socket.off("notification:new");
                socket.on("notification:new", (payload) => {
                    toast(payload?.title || "Notification", {
                        description: payload?.message || payload?.body || "",
                    });
                    window.dispatchEvent(new CustomEvent("notif:new", { detail: payload }));
                });

                socket.off("announcement:new");
                socket.on("announcement:new", (payload) => {
                    toast("Announcement", { description: payload?.title || "" });
                    window.dispatchEvent(new CustomEvent("announce:new", { detail: payload }));
                });
            } catch {
                // ignore
            }
        }

        initializeSocket();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <>
            <AppNav />
            {children}
        </>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            <SessionProvider>
                <InnerProviders>{children}</InnerProviders>
            </SessionProvider>
        </ApolloProvider>
    );
}
