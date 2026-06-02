import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PatrimonyLiabilitiesDashboard } from "@/components/patrimony/patrimony-liabilities-dashboard";
import { Loader2 } from "lucide-react";

export default async function PatrimonyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard/patrimony");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <PatrimonyLiabilitiesDashboard />
    </Suspense>
  );
}
