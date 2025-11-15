import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export function MechanicsTable({ data = [], onSelect, selectedId }) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Detalhamento por Mecânico</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mecânico</TableHead>
              <TableHead>Budgets</TableHead>
              <TableHead>Aceitos</TableHead>
              <TableHead>Cancelados</TableHead>
              <TableHead>Abertos</TableHead>
              <TableHead>Serviços Concluídos</TableHead>
              <TableHead>Taxa Aceite</TableHead>
              <TableHead>Taxa Cancelamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Nenhum mecânico encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((mechanic) => (
                <TableRow key={mechanic.id} className={selectedId === mechanic.id ? 'bg-muted/20' : ''}>
                  <TableCell className="font-medium">{mechanic.nome}</TableCell>
                  <TableCell>{mechanic.budgetsTotal}</TableCell>
                  <TableCell>{mechanic.budgetsAccepted}</TableCell>
                  <TableCell>{mechanic.budgetsCancelled}</TableCell>
                  <TableCell>{mechanic.budgetsOpen}</TableCell>
                  <TableCell>{mechanic.servicesCompleted}</TableCell>
                  <TableCell>{mechanic.acceptRate}%</TableCell>
                  <TableCell>{mechanic.cancelRate}%</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={selectedId === mechanic.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onSelect?.(mechanic.id)}
                    >
                      Ver detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
