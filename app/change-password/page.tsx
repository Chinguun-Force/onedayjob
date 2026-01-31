"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

async function gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    }).then((r) => r.json());

    if (res.errors?.length) throw new Error(res.errors[0].message);
    return res.data as T;
}

export default function ChangePasswordPage() {
    const router = useRouter();

    const [oldPassword, setOldPassword] = useState("111111"); // OTP default
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);

    const canSubmit = useMemo(() => {
        if (!oldPassword) return false;
        if (newPassword.length < 8) return false;
        if (newPassword !== confirm) return false;
        return true;
    }, [oldPassword, newPassword, confirm]);

    // optional: page дээр орж ирэхэд жижиг toast
    useEffect(() => {
        toast.message("Please change your password to continue.");
    }, []);

    async function onSubmit() {
        if (!canSubmit) return;

        setSaving(true);
        const t = toast.loading("Updating password...");

        try {
            await gql<{ changeMyPassword: boolean }>(
                `
          mutation ChangeMyPassword($old: String!, $nw: String!) {
            changeMyPassword(oldPassword: $old, newPassword: $nw)
          }
        `,
                { old: oldPassword, nw: newPassword }
            );

            toast.success("Password updated. Please login again.", { id: t });

            // хамгийн найдвартай: session token шинэчлэгдэх тул logout -> login
            await signOut({ redirect: true, callbackUrl: "/login" });
        } catch (e: any) {
            toast.error(e?.message ?? "Failed", { id: t });
            setSaving(false);
        }
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Change password</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>New password</Label>
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Confirm new password</Label>
                        <Input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Re-enter new password"
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={onSubmit}
                        disabled={!canSubmit || saving}
                    >
                        {saving ? "Saving..." : "Update password"}
                    </Button>

                    <div className="text-xs text-muted-foreground">
                        After changing password, you will be signed out and asked to login again.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}