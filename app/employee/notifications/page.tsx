"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useSocketNotifications } from "@/lib/useSocketNotifications";

export default function EmployeeNotificationsDemo() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;

    const [events, setEvents] = useState<any[]>([]);

    useSocketNotifications(userId, (payload) => {
        console.log("🔔 New notification", payload);

        setEvents((prev) => [payload, ...prev]);
    });

    if (!userId) {
        return <div style={{ padding: 24 }}>Login required</div>;
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>Realtime Notifications (Demo)</h1>
            <p>Socket.io ашиглан бодит цагийн мэдэгдэл авч байна.</p>

            <div style={{ marginTop: 16 }}>
                {events.length === 0 ? (
                    <div>No notifications yet</div>
                ) : (
                    events.map((e, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: 12,
                                border: "1px solid #ddd",
                                borderRadius: 6,
                                marginBottom: 12,
                            }}
                        >
                            <strong>{e.type}</strong>
                            <div style={{ fontSize: 12, color: "#666" }}>
                                {new Date(e.createdAt).toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
