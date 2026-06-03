"use client";

import { cn } from "@/lib/utils/cn";

interface InboxSelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: () => void;
  onClick?: (event: React.MouseEvent<HTMLInputElement>) => void;
  className?: string;
}

export function InboxSelectionCheckbox({
  checked,
  indeterminate,
  disabled,
  ariaLabel,
  onChange,
  onClick,
  className,
}: InboxSelectionCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      ref={(element) => {
        if (element) {
          element.indeterminate = Boolean(indeterminate);
        }
      }}
      onChange={onChange}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:ring-offset-1",
        className,
      )}
    />
  );
}
