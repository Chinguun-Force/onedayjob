"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { useSocketNotifications } from "@/lib/useSocketNotifications";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function EmployeeNotificationsPage() {
    const { data: session, status } = useSession();
    const userId = (session?.user as any)?.id as string | undefined;

    const [notifications, setNotifications] = useState<any[]>([]);

    const titleMap = useMemo<Record<string, string>>(
        () => ({
            ANNOUNCEMENT: "Announcement",
            PROFILE_UPDATED: "Profile updated",
            PASSWORD_CHANGE: "Password changed",
            ROLE_CHANGE: "Role changed",
            NEW_EMPLOYEE_ADDED: "New employee added",
        }),
        []
    );

    async function load() {
        const json = await fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `
          query {
            myNotifications {
              id
              status
              createdAt
              notification { id type }
            }
          }
        `,
            }),
        }).then((r) => r.json());

        if (json.errors?.length) {
            // session байхгүй үед эсвэл guard дээр унана
            console.log(json.errors[0].message);
            return;
        }

        setNotifications(json.data?.myNotifications ?? []);
    }

    // ✅ session ready болсны дараа load
    useEffect(() => {
        if (status === "authenticated" && userId) load();
    }, [status, userId]);

    // ✅ realtime: hook-оо ганцхан удаа
    useSocketNotifications(userId, (payload) => {
        toast(titleMap[payload.type] ?? "New notification");
        // хамгийн зөв нь: list дээр нэмж харуулахын тулд reload хийх эсвэл optimistic нэмэх
        load(); // шууд refresh (амар)
    });

    async function markRead(id: string) {
        const json = await fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `
          mutation ($id: ID!) {
            markRead(recipientId: $id)
          }
        `,
                variables: { id },
            }),
        }).then((r) => r.json());

        if (json.errors?.length) {
            toast.error(json.errors[0].message);
            return;
        }

        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n))
        );
    }

    // auth loading үед UI багахан placeholder өгвөл nicer
    if (status === "loading") return <div className="p-6">Loading...</div>;
    if (!userId) return <div className="p-6">Not signed in</div>;

    const unread = notifications.filter((n) => n.status === "UNREAD").length;

    return (
        <div className="max-w-xl mx-auto py-10 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Notifications</h1>
                {unread > 0 && <Badge variant="secondary">{unread} unread</Badge>}
            </div>

            <Separator />

            {notifications.length === 0 && (
                <p className="text-sm text-muted-foreground">No notifications</p>
            )}

            {notifications.map((n) => (
                <Card
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`cursor-pointer transition ${n.status === "UNREAD" ? "bg-muted/40" : "opacity-70"
                        }`}
                >
                    <CardContent className="py-3 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {titleMap[n.notification.type] ?? n.notification.type}
                            </span>
                            {n.status === "UNREAD" && <Badge variant="outline">New</Badge>}
                        </div>

                        <div className="text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
