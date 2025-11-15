import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { ChartPlaceholder } from './ChartPlaceholder'

export function MechanicDetailChart({ mechanic, data = [] }) {
  return (
    <Card className="border-border shadow-sm bg-card/80">
      <CardHeader className="space-y-1.5 pb-0">
        <CardTitle className="text-base font-semibold">
          Evolução {mechanic ? `– ${mechanic.nome}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[340px] pt-4">
        {!mechanic ? (
          <ChartPlaceholder
            title="Selecione um mecânico"
            description="Escolha um profissional na tabela abaixo para acompanhar o histórico."
          />
        ) : data.length === 0 ? (
          <ChartPlaceholder
            title="Sem histórico por aqui"
            description="Quando este mecânico gerar budgets ou serviços, a evolução aparecerá."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="period" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" name="Budgets Criados" stroke="hsl(var(--warning))" strokeWidth={2} />
              <Line type="monotone" dataKey="accepted" name="Budgets Aceitos" stroke="hsl(var(--success))" strokeWidth={2} />
              <Line type="monotone" dataKey="services" name="Serviços Gerados" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
