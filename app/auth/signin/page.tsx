"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { gql, useQuery, useMutation } from "@apollo/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ================= GRAPHQL ================= */

const CAN_SIGNUP_ADMIN = `
  query CanSignupAdmin {
    canSignupAdmin
  }
`;

const BOOTSTRAP_ADMIN = `
  mutation BootstrapAdmin($email: String!, $password: String!) {
    bootstrapAdminSignup(email: $email, password: $password)
  }
`;

/* ================= PAGE ================= */

export default function LoginPage() {
    const { data, loading } = useQuery<any>(gql(CAN_SIGNUP_ADMIN));

    if (loading) return null;

    // 🔹 Admin байхгүй үед → bootstrap
    if (data?.canSignupAdmin) {
        return <InitialAdminSetup />;
    }

    // 🔹 Normal login
    return <LoginForm />;
}

/* ================= LOGIN FORM ================= */

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

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

        // redirect-г middleware хийнэ
        window.location.href = "/";
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="w-full max-w-sm">
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Sign in</h1>
                        <p className="text-sm text-muted-foreground">
                            HR Notification System
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
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

                        {error && (
                            <div className="text-sm text-red-500">{error}</div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

/* ================= INITIAL ADMIN SETUP ================= */

function InitialAdminSetup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [signup] = useMutation<any>(gql(BOOTSTRAP_ADMIN));

    async function submit() {
        setLoading(true);
        setError("");

        try {
            await signup({ variables: { email, password } });
            window.location.reload(); // signup унтарна → login гарна
        } catch (e: any) {
            setError(e.message ?? "Failed to create admin");
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="w-full max-w-sm">
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">Initial Admin Setup</h1>
                        <p className="text-sm text-muted-foreground">
                            This step is required only once to initialize the system.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>Admin Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500">{error}</div>
                        )}

                        <Button
                            onClick={submit}
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Creating admin..." : "Create Admin"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}