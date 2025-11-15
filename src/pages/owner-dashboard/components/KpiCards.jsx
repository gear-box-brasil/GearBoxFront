import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function KpiCards({ metrics = [] }) {
  if (!metrics.length) return null
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className={cn('border-border shadow-sm bg-card/80')}>
          <CardContent className="flex flex-col gap-2 p-4 sm:p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
              {metric.label}
            </div>
            <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{metric.value}</p>
            {metric.helper && <p className="text-xs text-muted-foreground">{metric.helper}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
