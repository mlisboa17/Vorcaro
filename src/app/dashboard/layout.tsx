import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userEmail = session?.user?.email ?? "dev@logos.local";

  return <DashboardShell userEmail={userEmail}>{children}</DashboardShell>;
}
