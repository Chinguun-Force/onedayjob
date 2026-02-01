"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type GqlResp<T> = { data?: T; errors?: { message: string }[] };

async function gql<T>(query: string, variables?: Record<string, any>) {
    const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as GqlResp<T>;
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join(", "));
    return json.data as T;
}

type Template = { type: string; title: string; body: string };
type User = { id: string; email: string; name?: string | null; role: string };

const TEMPLATES_QUERY = `
  query Templates {
    templates {
      type
      title
      body
    }
  }
`;

const USERS_QUERY = `
  query Users {
    users {
      id
      email
      name
      role
    }
  }
`;

const SEND_NOTIFICATION = `
  mutation SendNotification($input: SendNotificationInput!) {
    sendNotification(input: $input)
  }
`;

export default function AnnouncePage() {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [sendToAll, setSendToAll] = useState(true);
    const [templateType, setTemplateType] = useState<string>("");
    const [search, setSearch] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const selectedTemplate = useMemo(
        () => templates.find((t) => t.type === templateType),
        [templates, templateType]
    );

    const employees = useMemo(
        () => users.filter((u) => u.role === "EMPLOYEE"),
        [users]
    );

    const filteredEmployees = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter((u) => {
            const n = (u.name ?? "").toLowerCase();
            const e = u.email.toLowerCase();
            return n.includes(q) || e.includes(q);
        });
    }, [employees, search]);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const data = await gql<{ templates: Template[] }>(TEMPLATES_QUERY);
                if (!active) return;
                setTemplates(data.templates ?? []);
                // default template сонголт
                if ((data.templates?.length ?? 0) > 0) setTemplateType(data.templates[0].type);
            } catch (e: any) {
                toast("Failed to load templates", { description: e?.message ?? "" });
            }
        })();

        (async () => {
            try {
                const data = await gql<{ users: User[] }>(USERS_QUERY);
                if (!active) return;
                setUsers(data.users ?? []);
            } catch (e: any) {
                toast("Failed to load users", { description: e?.message ?? "" });
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    function toggleUser(id: string) {
        setSelectedUserIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function onSend() {
        if (!templateType) {
            toast("Choose a template first");
            return;
        }

        if (!sendToAll && selectedUserIds.length === 0) {
            toast("Select at least 1 employee", { description: "Or enable “Send to all employees”." });
            return;
        }

        setLoading(true);
        try {
            await gql<{ sendNotification: boolean }>(SEND_NOTIFICATION, {
                input: {
                    type: templateType, // ✅ template.type ашиглана
                    targetRole: "EMPLOYEE",
                    payload: sendToAll ? {} : { userIds: selectedUserIds },
                },
            });

            toast("Sent", {
                description: sendToAll
                    ? "Announcement sent to all employees."
                    : `Announcement sent to ${selectedUserIds.length} employee(s).`,
            });

            // reset
            setSelectedUserIds([]);
            setSearch("");
        } catch (e: any) {
            toast("Send failed", { description: e?.message ?? "" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-3xl p-4">
            <div className="mb-4">
                <h1 className="text-xl font-semibold">Announce</h1>
                <p className="text-sm text-muted-foreground">
                    Template сонгоод employee нарт announcement явуулна.
                </p>
            </div>

            <Card>
                <CardContent className="p-6 space-y-6">
                    {/* Send to all toggle */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <Label>Бүх ажилчдад явуулах</Label>
                            <div className="text-xs text-muted-foreground">
                                Асаалттай үед бүх EMPLOYEE-д broadcast хийнэ.
                            </div>
                        </div>
                        <Switch checked={sendToAll} onCheckedChange={setSendToAll} />
                    </div>

                    {/* Template dropdown */}
                    <div className="space-y-2">
                        <Label>Template</Label>
                        <Select value={templateType} onValueChange={setTemplateType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose template" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map((t) => (
                                    <SelectItem key={t.type} value={t.type}>
                                        {t.type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Preview */}
                        {selectedTemplate && (
                            <div className="rounded-md border p-3 text-sm">
                                <div className="font-medium">{selectedTemplate.title}</div>
                                <div className="mt-1 text-muted-foreground whitespace-pre-wrap">
                                    {selectedTemplate.body}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Employee selection (only if not sendToAll) */}
                    {!sendToAll && (
                        <div className="space-y-2">
                            <div className="flex items-end justify-between gap-3">
                                <div className="space-y-1">
                                    <Label>Хэнд илгээх вэ</Label>
                                    <div className="text-xs text-muted-foreground">
                                        Сонгосон employee-үүд рүү илгээнэ.
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Selected: {selectedUserIds.length}
                                </div>
                            </div>

                            <Input
                                placeholder="Search by name/email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            <div className="max-h-64 overflow-auto rounded-md border p-2 space-y-1">
                                {filteredEmployees.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground">No employees found.</div>
                                ) : (
                                    filteredEmployees.map((u) => {
                                        const checked = selectedUserIds.includes(u.id);
                                        return (
                                            <button
                                                type="button"
                                                key={u.id}
                                                onClick={() => toggleUser(u.id)}
                                                className="w-full rounded-md px-2 py-2 text-left hover:bg-muted flex items-center justify-between"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium truncate">
                                                        {u.name ?? u.email}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                                                </div>
                                                <div className="text-xs">{checked ? "✓" : ""}</div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    <Button onClick={onSend} disabled={loading} className="w-full">
                        {loading ? "Sending..." : sendToAll ? "Send to all employees" : "Send"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
