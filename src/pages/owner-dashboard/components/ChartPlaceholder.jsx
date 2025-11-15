import { FileBarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChartPlaceholder({ title, description, className }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 px-6 text-center',
        className
      )}
    >
      <FileBarChart2 className="mb-3 h-7 w-7 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}
