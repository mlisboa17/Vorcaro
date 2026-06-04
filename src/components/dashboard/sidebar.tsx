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

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ userEmail, mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col bg-slate-950 text-slate-100",
        mobile && "shadow-2xl",
      )}
      aria-label="Menu principal"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <Link
          href="/dashboard/inbox"
          onClick={onClose}
          className="text-lg font-bold tracking-[0.2em] text-white transition hover:text-emerald-300"
        >
          LOGOS
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {DASHBOARD_NAV_GROUPS.map((group, groupIndex) => (
          <div
            key={group.title}
            className={cn(groupIndex > 0 && "mt-6 border-t border-white/10 pt-5")}
          >
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                        active
                          ? "border-l-2 border-emerald-400 bg-white/10 pl-[10px] text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          active ? "text-emerald-400" : "text-slate-400",
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="rounded-lg bg-white/5 px-3 py-3">
          <p className="truncate text-xs text-slate-400">Conectado como</p>
          <p className="mt-0.5 truncate text-sm font-medium text-white">{userEmail}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
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
          <span className="text-sm font-bold tracking-[0.18em] text-slate-900">LOGOS</span>
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
