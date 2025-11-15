import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

export function MechanicDetailChart({ mechanic, data = [] }) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">
          Evolução {mechanic ? `– ${mechanic.nome}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[360px]">
        {!mechanic ? (
          <p className="text-sm text-muted-foreground">Selecione um mecânico para ver detalhes.</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este mecânico ainda não possui histórico.</p>
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
