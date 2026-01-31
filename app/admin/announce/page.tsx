"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function AdminAnnouncePage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [template, setTemplate] = useState("");
    const [sendAll, setSendAll] = useState(true);
    const [selected, setSelected] = useState<string[]>([]);

    useEffect(() => {
        fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `
          query {
            templates { type title }
            adminUsers { id email role }
          }
        `,
            }),
        })
            .then(r => r.json())
            .then(res => {
                setTemplates(res.data.templates);
                setUsers(res.data.adminUsers.filter((u: any) => u.role === "EMPLOYEE"));
            });
    }, []);

    async function send() {
        const toastId = toast.loading("Sending notification...");

        try {
            const res = await fetch("/api/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: `
          mutation ($input: SendNotificationInput!) {
            sendNotification(input: $input)
          }
        `,
                    variables: {
                        input: {
                            type: template,                 // <-- state-ээсээ авна
                            targetRole: "EMPLOYEE",
                            payload: sendAll ? null : { userIds: selected },
                        },
                    },
                }),
            });

            const json = await res.json();

            if (json.errors?.length) {
                toast.error(json.errors[0].message, { id: toastId });
                return;
            }

            toast.success("Queued ✅", { id: toastId });
        } catch (e: any) {
            toast.error(e?.message ?? "Something went wrong", { id: toastId });
        }
    }

    return (
        <div className="max-w-3xl mx-auto py-8 space-y-6">
            <h1 className="text-xl font-semibold">Send announcement</h1>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <select
                        className="border px-2 py-1 w-full"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                    >
                        <option value="">Select template</option>
                        {templates.map(t => (
                            <option key={t.type} value={t.type}>
                                {t.title}
                            </option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2">
                        <Checkbox checked={sendAll} onCheckedChange={() => setSendAll(!sendAll)} />
                        Send to all employees
                    </label>

                    {!sendAll && (
                        <div className="space-y-2">
                            {users.map(u => (
                                <label key={u.id} className="flex gap-2 items-center">
                                    <Checkbox
                                        checked={selected.includes(u.id)}
                                        onCheckedChange={() =>
                                            setSelected(prev =>
                                                prev.includes(u.id)
                                                    ? prev.filter(x => x !== u.id)
                                                    : [...prev, u.id]
                                            )
                                        }
                                    />
                                    {u.email}
                                </label>
                            ))}
                        </div>
                    )}

                    <Button disabled={!template} onClick={send}>
                        Send
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
