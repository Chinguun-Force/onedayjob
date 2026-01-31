"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type AdminUserRow = {
    id: string;
    email: string;
    name?: string | null;
    role: "ADMIN" | "EMPLOYEE";
    mustChangePassword: boolean;
    createdAt: string;
};

async function gql<T>(query: string, variables?: any): Promise<T> {
    const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    }).then((r) => r.json());

    if (res?.errors?.length) throw new Error(res.errors[0].message);
    return res.data as T;
}

export default function AdminUsersPage() {
    const [rows, setRows] = useState<AdminUserRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");

    // add user dialog states
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE");

    async function load() {
        setLoading(true);
        try {
            const data = await gql<{ adminUsers: AdminUserRow[] }>(`
        query {
          adminUsers {
            id
            email
            name
            role
            mustChangePassword
            createdAt
          }
        }
      `);
            setRows(data.adminUsers);
        } catch (e: any) {
            toast.error(e.message ?? "Failed to load users");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return rows;
        return rows.filter((u) =>
            (u.email ?? "").toLowerCase().includes(s) ||
            (u.name ?? "").toLowerCase().includes(s) ||
            (u.role ?? "").toLowerCase().includes(s)
        );
    }, [rows, q]);

    async function createUser() {
        if (!email.trim()) return toast.error("Email required");
        const t = toast.loading("Creating user...");

        try {
            const data = await gql<{ createUser: AdminUserRow }>(
                `
        mutation($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            name
            role
            mustChangePassword
            createdAt
          }
        }
        `,
                { input: { email: email.trim(), role } }
            );

            // list-д дээрээс нь нэмнэ
            setRows((prev) => [data.createUser, ...prev]);
            toast.success("User created (OTP = 111111)");
            setOpen(false);
            setEmail("");
            setRole("EMPLOYEE");
        } catch (e: any) {
            toast.error(e.message ?? "Create failed");
        } finally {
            toast.dismiss(t);
        }
    }

    async function resetOtp(userId: string) {
        const t = toast.loading("Resetting OTP...");
        try {
            await gql<{ resetUserPassword: boolean }>(
                `
        mutation($id: ID!) {
          resetUserPassword(userId: $id)
        }
        `,
                { id: userId }
            );

            // UI дээр mustChangePassword=true болгож харуулж болно
            setRows((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, mustChangePassword: true } : u))
            );

            toast.success("OTP reset (111111)");
        } catch (e: any) {
            toast.error(e.message ?? "Reset failed");
        } finally {
            toast.dismiss(t);
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-10 space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">Admin Users</h1>
                    <p className="text-sm text-muted-foreground">
                        Create users, reset OTP, and monitor must-change-password state.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
                        Logout
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>Add user</Button>
                        </DialogTrigger>

                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create new user</DialogTitle>
                                <DialogDescription>
                                    New user default OTP password is <b>111111</b>. They must change it after login.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="text-sm">Email</div>
                                    <Input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@company.com"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="text-sm">Role</div>
                                    <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={createUser}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by email/name/role..."
                    className="max-w-md"
                />
                <Button variant="secondary" onClick={load} disabled={loading}>
                    {loading ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}

                        {filtered.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.email}</TableCell>
                                <TableCell>{u.name ?? "-"}</TableCell>
                                <TableCell>
                                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                                        {u.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {u.mustChangePassword ? (
                                        <Badge variant="outline">Must change</Badge>
                                    ) : (
                                        <Badge variant="secondary">OK</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(u.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => resetOtp(u.id)}
                                    >
                                        Reset OTP
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}