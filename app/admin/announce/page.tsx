"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function AdminAnnouncePage() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [sendToAll, setSendToAll] = useState(true);
    const [loading, setLoading] = useState(false);

    async function send() {
        if (!title || !message) {
            toast.error("Title and message required");
            return;
        }

        setLoading(true);

        const res = await fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `
          mutation SendAnnounce($input: SendNotificationInput!) {
            sendNotification(input: $input)
          }
        `,
                variables: {
                    input: {
                        type: "ANNOUNCEMENT",
                        targetRole: "EMPLOYEE",
                        payload: {
                            title,
                            message,
                        },
                    },
                },
            }),
        }).then((r) => r.json());

        if (res.errors) {
            toast.error(res.errors[0].message);
            setLoading(false);
            return;
        }

        toast.success("Announcement sent 🎉");
        setTitle("");
        setMessage("");
        setLoading(false);
    }

    return (
        <div className="max-w-xl mx-auto py-10">
            <Card>
                <CardContent className="space-y-4 p-6">
                    <h1 className="text-xl font-semibold">Send Announcement</h1>

                    <div className="space-y-1">
                        <Label>Title</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                        <Label>Message</Label>
                        <Textarea
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox checked disabled />
                        <Label>Send to all employees</Label>
                    </div>

                    <Button onClick={send} disabled={loading} className="w-full">
                        {loading ? "Sending..." : "Send announcement"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}