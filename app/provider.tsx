"use client";

import { SessionProvider } from "next-auth/react";
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
    uri: "/api/graphql",
    cache: new InMemoryCache(),
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ApolloProvider client={client}>
            <SessionProvider>{children}</SessionProvider>
        </ApolloProvider>
    );
}
