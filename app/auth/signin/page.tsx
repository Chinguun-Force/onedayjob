"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GqlResp<T> = { data?: T; errors?: { message: string }[] };

async function gql<T>(query: string, variables?: Record<string, any>) {
    const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // cookie/session хэрэгтэй тул credentials include
        credentials: "include",
        body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json()) as GqlResp<T>;
    if (json.errors?.length) {
        throw new Error(json.errors.map((e) => e.message).join(", "));
    }
    return json.data as T;
}

const CAN_SIGNUP_ADMIN = `
  query CanSignupAdmin {
    canSignupAdmin
  }
`;

const BOOTSTRAP_ADMIN = `
  mutation BootstrapAdminSignup($email: String!, $password: String!) {
    bootstrapAdminSignup(email: $email, password: $password)
  }
`;

export default function SignInPage() {
    const [loading, setLoading] = useState(false);
    const [bootstrapMode, setBootstrapMode] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    // sign in form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // bootstrap admin form
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await gql<{ canSignupAdmin: boolean }>(CAN_SIGNUP_ADMIN);
                if (mounted) setBootstrapMode(data.canSignupAdmin);
            } catch (e: any) {
                // GraphQL route асч байвал bootstrapMode-г false гэж үзээд login харуулж болно
                if (mounted) {
                    setBootstrapMode(false);
                    setError(e?.message ?? "Failed to load");
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    async function onSignIn(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError("Invalid email or password");
            setLoading(false);
            return;
        }

        // redirect-г middleware чинь шийднэ
        window.location.href = "/";
    }

    async function onBootstrap(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 1) create initial admin
            await gql<{ bootstrapAdminSignup: boolean }>(BOOTSTRAP_ADMIN, {
                email: adminEmail,
                password: adminPassword,
            });

            // 2) шууд тэр admin-аараа login хийчихье
            const res = await signIn("credentials", {
                email: adminEmail,
                password: adminPassword,
                redirect: false,
            });

            if (res?.error) {
                setError("Admin created, but sign in failed. Try signing in.");
                setLoading(false);
                return;
            }

            window.location.href = "/";
        } catch (e: any) {
            setError(e?.message ?? "Bootstrap failed");
            setLoading(false);
        }
    }

    // bootstrapMode null үед loading state
    const isChecking = bootstrapMode === null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="w-full max-w-sm">
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">
                            {bootstrapMode ? "Initial Admin Setup" : "Sign in"}
                        </h1>
                        <p className="text-sm text-muted-foreground">HR Notification System</p>
                    </div>

                    {isChecking ? (
                        <div className="text-sm text-muted-foreground">Checking system...</div>
                    ) : bootstrapMode ? (
                        // ✅ Admin bootstrap form
                        <form onSubmit={onBootstrap} className="space-y-4">
                            <div className="space-y-1">
                                <Label>Admin Email</Label>
                                <Input
                                    type="email"
                                    required
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Admin Password</Label>
                                <Input
                                    type="password"
                                    required
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use a strong password (min 8 chars recommended).
                                </p>
                            </div>

                            {error && <div className="text-sm text-red-500">{error}</div>}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Creating..." : "Create Admin & Sign in"}
                            </Button>
                        </form>
                    ) : (
                        // ✅ Normal sign in form
                        <form onSubmit={onSignIn} className="space-y-4">
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            {error && <div className="text-sm text-red-500">{error}</div>}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Signing in..." : "Sign in"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}