import { redirect } from "next/navigation";

// TODO (Phase 4): True alerts consolidation
// Currently: routing alias to notifications
// Future: merge AlertsModule domain logic into Notifications
// - Unify data models (/api/alerts → /api/notifications)
// - Implement alerts view in NotificationsDashboard
// - Remove this redirect and alerts module
export default async function AlertsPage() {
  redirect("/dashboard/notifications");
}
