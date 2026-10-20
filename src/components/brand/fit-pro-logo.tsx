import React from "react";

interface FitProLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export function FitProLogo({
  size = 28,
  className = "",
  showBackground = false,
  ...props
}: FitProLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="fit-PRO logo"
      className={className}
      {...props}
    >
      <title>fit-PRO Brand Mark — The Pulse Void</title>

      {showBackground && (
        <rect width="256" height="256" rx="36" fill="#070A09" />
      )}

      <defs>
        <linearGradient
          id="fitProPulseGrad"
          x1="44"
          y1="36"
          x2="220"
          y2="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* Blade 1: Left Monolithic Power Column ('F' Stem) */}
      <polygon
        points="35,219 69,219 118,36 84,36"
        fill="url(#fitProPulseGrad)"
      />

      {/* 2.5D Layering Fold (Interlocking Depth Shadow #059669) */}
      <polygon
        points="118,36 132,66 118,66 104,36"
        fill="#059669"
      />

      {/* Blade 2: Upper 'P' Velocity Wing (Separated by exact 14px Pulse Void) */}
      <path
        d="M 132 36 L 188 36 L 218 66 L 210 96 L 182 124 L 108 124 L 116 96 L 168 96 L 182 82 L 168 66 L 124 66 Z"
        fill="url(#fitProPulseGrad)"
      />

      {/* Progressive Overload Stride (Mid-Spoke with Exact 45° Forward Razor Terminal) */}
      <polygon
        points="71,144 166,144 196,174 63,174"
        fill="url(#fitProPulseGrad)"
      />

      {/* Upward Momentum Kinetic Fin (Bottom Right Telemetry Accent) */}
      <polygon
        points="140,194 186,194 210,218 164,218"
        fill="#06B6D4"
      />
    </svg>
  );
}
