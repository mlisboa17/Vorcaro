"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";

export type CheckedState = boolean | "indeterminate";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type"> {
  checked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled, className, id, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Sync the native indeterminate property (cannot be set via HTML attribute)
    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = checked === "indeterminate";
        inputRef.current.checked = checked === true;
      }
    }, [checked]);

    const isChecked = checked === true;
    const isIndeterminate = checked === "indeterminate";

    return (
      <span className="relative inline-flex items-center justify-center">
        <input
          {...props}
          ref={inputRef}
          id={id}
          type="checkbox"
          disabled={disabled}
          className="peer sr-only"
          checked={isChecked}
          onChange={(e) => {
            if (onCheckedChange) {
              // If currently indeterminate, next state is checked
              if (isIndeterminate) {
                onCheckedChange(true);
              } else {
                onCheckedChange(e.target.checked);
              }
            }
          }}
        />
        {/* Visual box */}
        <span
          aria-hidden="true"
          className={[
            "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition-colors",
            disabled ? "cursor-not-allowed opacity-50" : "",
            isChecked || isIndeterminate
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-300 bg-white hover:border-slate-400",
            className ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            if (!disabled) {
              inputRef.current?.click();
            }
          }}
        >
          {isIndeterminate ? (
            <Minus className="h-3 w-3" strokeWidth={3} />
          ) : isChecked ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : null}
        </span>
      </span>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
