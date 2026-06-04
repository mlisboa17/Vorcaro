import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VorcaroChatDashboard } from "@/components/vorcaro/vorcaro-chat-dashboard";

export default async function VorcaroChatPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/vorcaro/chat");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vorcaro Chat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consultor financeiro conversacional — respostas com dados reais do LOGOS.
        </p>
      </header>
      <VorcaroChatDashboard />
    </div>
  );
}
