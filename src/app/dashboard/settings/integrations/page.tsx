import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { TelegramIntegrationsPanel } from "@/components/settings/telegram-integrations-panel";
import { ArrowLeft } from "lucide-react";

export default async function SettingsIntegrationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/settings/integrations");
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos cadastros
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Integrações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conecte canais externos ao Vorcaro Finance Control.
        </p>
      </header>

      <TelegramIntegrationsPanel />
    </div>
  );
}
