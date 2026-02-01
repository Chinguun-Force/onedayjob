"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

type NavItem = { label: string; href: string };

const ADMIN_NAV: NavItem[] = [
    { label: "Dashboard", href: "/admin" },
    { label: "Announce", href: "/admin/announce" },
    { label: "Templates", href: "/admin/templates" },
    // { label: "Users", href: "/admin/users" },
];

const EMPLOYEE_NAV: NavItem[] = [
    { label: "Home", href: "/employee" },
    { label: "Notifications", href: "/employee/notifications" },
];

export default function AppNav() {
    const pathname = usePathname();
    const { data } = useSession();

    const role = (data?.user as any)?.role as "ADMIN" | "EMPLOYEE" | undefined;

    // auth page дээр nav харуулахгүй
    if (
        pathname.startsWith("/auth/signin") ||
        pathname.startsWith("/change-password")
    ) {
        return null;
    }

    // session байхгүй үед nav харуулахгүй
    if (!role) return null;

    const items = role === "ADMIN" ? ADMIN_NAV : EMPLOYEE_NAV;

    return (
        <div className="w-full border-b bg-background">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-6">
                    <Link href={role === "ADMIN" ? "/admin" : "/employee"} className="font-semibold">
                        HR System
                    </Link>

                    <nav className="flex items-center gap-4 text-sm">
                        {items.map((it) => {
                            const active =
                                pathname === it.href || pathname.startsWith(it.href + "/");
                            return (
                                <Link
                                    key={it.href}
                                    href={it.href}
                                    className={active ? "font-semibold" : "text-muted-foreground hover:text-foreground"}
                                >
                                    {it.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden text-sm text-muted-foreground md:block">
                        {data?.user?.email}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    >
                        Sign out
                    </Button>
                </div>
            </div>
        </div>
    );
}
