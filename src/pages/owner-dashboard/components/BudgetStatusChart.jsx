import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts'
import { ChartPlaceholder } from './ChartPlaceholder'

const COLORS = ['hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))', '#94a3b8']

export function BudgetStatusChart({ data = [] }) {
  return (
    <Card className="border-border shadow-sm bg-card/80">
      <CardHeader className="space-y-1.5 pb-0">
        <CardTitle className="text-base font-semibold">Status dos Budgets</CardTitle>
        <p className="text-xs text-muted-foreground">Distribuição geral dos budgets ativos.</p>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        {data.length === 0 ? (
          <ChartPlaceholder
            title="Nenhum status registrado"
            description="Assim que surgirem budgets, o status consolidado aparecerá aqui."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                dataKey="value"
                data={data}
                nameKey="label"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
