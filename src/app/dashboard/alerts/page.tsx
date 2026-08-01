import { redirect } from 'next/navigation';

export default function AlertsPage() {
  redirect('/dashboard/notifications?type=alert');
}
