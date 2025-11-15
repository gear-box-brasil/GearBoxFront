import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartPlaceholder } from './ChartPlaceholder'

export function MechanicsComparisonChart({ data = [] }) {
  return (
    <Card className="border-border shadow-sm bg-card/80">
      <CardHeader className="space-y-1.5 pb-0">
        <CardTitle className="text-base font-semibold">Comparativo de Mecânicos</CardTitle>
        <p className="text-xs text-muted-foreground">Budgets gerados x serviços concluídos.</p>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        {data.length === 0 ? (
          <ChartPlaceholder
            title="Em breve por aqui"
            description="Cadastre mecânicos e gere budgets para liberar o comparativo."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 10, left: 10, right: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip />
              <Bar dataKey="budgets" name="Budgets" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              <Bar
                dataKey="services"
                name="Serviços Concluídos"
                fill="hsl(var(--success))"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
