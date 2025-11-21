import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCards({ metrics = [] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className={cn("border-border bg-card/80 shadow-sm")}
        >
          <CardContent className="flex min-h-[110px] flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </div>
            <p className="text-2xl font-semibold text-foreground break-words w-full leading-tight">
              {metric.value}
            </p>
            {metric.helper && (
              <p className="text-xs text-muted-foreground">{metric.helper}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
