import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { InstrumentsDashboard } from "@/components/instruments/instruments-dashboard";
import { Loader2 } from "lucide-react";

export default async function InstrumentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/instruments");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <InstrumentsDashboard />
    </Suspense>
  );
}
