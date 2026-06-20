import React from "react";

interface VorcaroLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function VorcaroLogo({ className, ...props }: VorcaroLogoProps) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-8 w-auto ${className || ""}`}
      {...props}
    >
      <g className="translate-y-[4px]">
        {/* V Mark - Left wing */}
        <path
          d="M6 0L14 24L22 0H30L17 36H11L-2 0H6Z"
          className="fill-primary"
        />
        {/* V Mark - Right accent wing */}
        <path
          d="M26 0L20 18L24 30L36 0H26Z"
          className="fill-blue-600 dark:fill-blue-400 opacity-80"
        />
        
        {/* Text Logo */}
        <text
          x="44"
          y="26"
          className="fill-foreground font-bold text-[24px] tracking-tight"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          VORCARO
        </text>
      </g>
    </svg>
  );
}
