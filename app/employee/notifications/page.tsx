"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RecipientStatus = "UNREAD" | "READ";

type NotificationRecipient = {
    id: string;
    status: RecipientStatus;
    deliveredAt?: string | null;
    readAt?: string | null;
    createdAt: string;
    notification: {
        id: string;
        type: string;
        payloadJson?: any;
        createdAt: string;
    };
};

const Q_MY_NOTIFS = `
  query MyNotifs {
    myNotifications {
      id
      status
      deliveredAt
      readAt
      createdAt
      notification {
        id
        type
        payloadJson
        createdAt
      }
    }
  }
`;

const M_MARK_READ = `
  mutation MarkRead($recipientId: ID!) {
    markRead(recipientId: $recipientId)
  }
`;

const M_MARK_ALL_READ = `
  mutation MarkAllRead {
    markAllRead
  }
`;

async function gql<T>(query: string, variables?: any): Promise<T> {
    const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    }).then((r) => r.json());

    if (res.errors?.length) throw new Error(res.errors[0].message);
    return res.data as T;
}

function formatWhen(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString();
}

export default function EmployeeNotificationsPage() {
    const [items, setItems] = useState<NotificationRecipient[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        try {
            setError(null);
            setLoading(true);
            const data = await gql<{ myNotifications: NotificationRecipient[] }>(Q_MY_NOTIFS);
            setItems(data.myNotifications ?? []);
        } catch (e: any) {
            setError(e.message || "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const unreadCount = useMemo(
        () => items.filter((x) => x.status === "UNREAD").length,
        [items]
    );
    useEffect(() => {
        const onNew = () => load();
        window.addEventListener("notif:new", onNew);
        return () => window.removeEventListener("notif:new", onNew);
    }, []);

    async function markRead(recipientId: string) {
        try {
            setBusyId(recipientId);
            await gql<{ markRead: boolean }>(M_MARK_READ, { recipientId });

            // local update (reload хийхгүйгээр)
            setItems((prev) =>
                prev.map((x) =>
                    x.id === recipientId
                        ? { ...x, status: "READ", readAt: new Date().toISOString() }
                        : x
                )
            );
        } catch (e: any) {
            setError(e.message || "Failed to mark as read");
        } finally {
            setBusyId(null);
        }
    }

    async function markAllRead() {
        try {
            setBusyId("ALL");
            await gql<{ markAllRead: number | boolean }>(M_MARK_ALL_READ);

            setItems((prev) =>
                prev.map((x) =>
                    x.status === "UNREAD"
                        ? { ...x, status: "READ", readAt: new Date().toISOString() }
                        : x
                )
            );
        } catch (e: any) {
            setError(e.message || "Failed to mark all as read");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-10 space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold">Notifications</h1>
                    <p className="text-sm text-muted-foreground">
                        Your inbox{" "}
                        {unreadCount > 0 ? (
                            <Badge variant="destructive">{unreadCount} unread</Badge>
                        ) : (
                            <Badge variant="secondary">All caught up</Badge>
                        )}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="secondary" onClick={load} disabled={loading || busyId === "ALL"}>
                        Refresh
                    </Button>
                    <Button onClick={markAllRead} disabled={loading || unreadCount === 0 || busyId === "ALL"}>
                        {busyId === "ALL" ? "Marking..." : "Mark all read"}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-500">{error}</div>
            )}

            {loading ? (
                <Card><CardContent className="p-6">Loading...</CardContent></Card>
            ) : items.length === 0 ? (
                <Card><CardContent className="p-6 text-muted-foreground">No notifications yet.</CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {items.map((r) => {
                        const payload = r.notification.payloadJson || {};
                        const title =
                            payload.title ||
                            (r.notification.type === "ANNOUNCEMENT" ? "Announcement" : r.notification.type);

                        const message = payload.message || payload.body || "";

                        return (
                            <Card key={r.id} className={r.status === "UNREAD" ? "border-primary/40" : ""}>
                                <CardContent className="p-5 space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h2 className="font-semibold">{title}</h2>
                                                {r.status === "UNREAD" ? (
                                                    <Badge variant="destructive">UNREAD</Badge>
                                                ) : (
                                                    <Badge variant="secondary">READ</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {formatWhen(r.createdAt)}
                                            </p>
                                        </div>

                                        {r.status === "UNREAD" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={busyId === r.id}
                                                onClick={() => markRead(r.id)}
                                            >
                                                {busyId === r.id ? "..." : "Mark read"}
                                            </Button>
                                        )}
                                    </div>

                                    {message ? (
                                        <p className="text-sm whitespace-pre-wrap">{message}</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            (No message body)
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}