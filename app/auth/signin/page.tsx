"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

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
