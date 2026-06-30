import { PatrimonyDashboard } from "@/components/patrimony/patrimony-dashboard";
import { SettingsToastProvider } from "@/components/settings/settings-toast";

export default function InvestmentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SettingsToastProvider>
        <PatrimonyDashboard />
      </SettingsToastProvider>
    </div>
  );
}
