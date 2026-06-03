"use client";

export function AdvisorMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800">
      {lines.map((line, index) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={index} className="mt-3 text-base font-semibold text-slate-900">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={index} className="ml-4 list-disc">
              {line.slice(2)}
            </li>
          );
        }
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
