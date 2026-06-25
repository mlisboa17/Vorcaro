import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const userEmail = session.user.email ?? "dev@logos.local";

  return <DashboardShell userEmail={userEmail}>{children}</DashboardShell>;
}
