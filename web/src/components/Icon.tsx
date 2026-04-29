import type { LucideIcon } from "lucide-react";

interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  strokeWidth?: number;
  "aria-label"?: string;
}

export function Icon({
  icon: LucideIconComponent,
  size = 20,
  strokeWidth = 2,
  className = "",
  "aria-label": ariaLabel,
}: IconProps) {
  return (
    <LucideIconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}
