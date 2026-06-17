"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DASHBOARD_NAV_GROUPS } from "@/lib/navigation/dashboard-nav";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  userEmail: string;
  mobile?: boolean;
  onClose?: () => void;
}

function useNotificationBadgeCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications/summary", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { unreadCount?: number } | null) => {
        setCount(data?.unreadCount ?? 0);
      })
      .catch(() => setCount(0));
  }, []);

  return count;
}

function isActiveRoute(pathname: string, href: string, exactMatch?: boolean): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (exactMatch) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ userEmail, mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const unreadNotifications = useNotificationBadgeCount();

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col bg-[#1d2736] text-slate-200 border-r border-slate-800/60",
        mobile && "shadow-2xl",
      )}
      aria-label="Menu principal"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="text-base font-bold tracking-[0.2em] text-white transition hover:text-sky-400"
        >
          LOGOS
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {DASHBOARD_NAV_GROUPS.map((group, groupIndex) => (
          <div
            key={group.title}
            className={cn(groupIndex > 0 && "mt-4 border-t border-slate-800/80 pt-3")}
          >
            <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActiveRoute(pathname, item.href, item.exactMatch);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                        active
                          ? "border-l-2 border-sky-400 bg-slate-800/80 pl-[8px] text-white"
                          : "text-slate-300 hover:bg-slate-800/40 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-sky-400" : "text-slate-400",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badgeKey === "notifications" && unreadNotifications > 0 ? (
                        <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-bold text-white leading-none">
                          {unreadNotifications > 99 ? "99+" : unreadNotifications}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800/80 px-3 py-3">
        <div className="rounded-md bg-slate-800/30 px-2.5 py-2.5 border border-slate-800/40">
          <p className="truncate text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Conectado como</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-200">{userEmail}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700/60 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-white"
          >
            <LogOut className="h-3 w-3" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

interface DashboardShellProps {
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30">
        <Sidebar userEmail={userEmail} />
      </div>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
      >
        <Sidebar userEmail={userEmail} mobile onClose={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="text-sm font-bold tracking-[0.18em] text-slate-900 transition hover:text-slate-700">
            LOGOS
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
