import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
};

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <img
      src="/logo.svg"
      alt="Gear Box"
      className={cn("w-auto select-none", sizeClasses[size], className)}
      draggable={false}
    />
  );
}
