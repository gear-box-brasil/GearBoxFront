import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function KpiCards({ metrics = [] }) {
  if (!metrics.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className={cn('border-border shadow-sm bg-card/70 backdrop-blur')}>
          <CardContent className="p-5 space-y-3">
            <div className="text-sm uppercase tracking-wide text-muted-foreground">{metric.label}</div>
            <p className="text-3xl font-semibold text-foreground">{metric.value}</p>
            {metric.helper && <p className="text-xs text-muted-foreground">{metric.helper}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
