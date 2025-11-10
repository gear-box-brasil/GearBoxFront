import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "auto" | "light" | "dark";

const sizeClasses: Record<LogoSize, string> = {
  sm: "w-[48px] h-[48px]",
  md: "w-[112px] h-[40px]",
  lg: "w-[160px] h-[48px]",
  xl: "w-[224px] h-[64px]",
};

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
}

export function Logo({ size = "md", variant = "auto", className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = variant === "dark" ? true : variant === "light" ? false : resolvedTheme === "dark";

  const gradient = isDarkTheme
    ? "linear-gradient(135deg, #e8eaed 0%, #ffc107 70%)"
    : "linear-gradient(135deg, #2e3a45 0%, #f5a300 85%)";

  return (
    <span
      aria-label="Gear Box logo"
      role="img"
      className={cn("logo-mask shrink-0", sizeClasses[size], className)}
      style={{ background: gradient }}
    />
  );
}
