import Link from "next/link";
import { VORCARO_HUB_CARDS } from "@/lib/navigation/dashboard-nav";
import { cn } from "@/lib/utils/cn";

export function VorcaroHubDashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {VORCARO_HUB_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.href}
            href={card.href}
            prefetch={false}
            className={cn(
              "group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition",
              "hover:border-emerald-300 hover:shadow-md",
            )}
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{card.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
