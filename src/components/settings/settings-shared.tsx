export function SettingsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export function SettingsComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">Este cadastro será habilitado em breve.</p>
    </div>
  );
}
