import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const orders = [
  {
    id: "OS-001",
    client: "João Silva",
    vehicle: "Honda Civic 2020",
    plate: "ABC-1234",
    service: "Troca de óleo + Filtros",
    status: "em_andamento",
    date: "2024-01-15",
    value: "R$ 450,00",
  },
  {
    id: "OS-002",
    client: "Maria Santos",
    vehicle: "Toyota Corolla 2019",
    plate: "DEF-5678",
    service: "Revisão completa",
    status: "aguardando",
    date: "2024-01-14",
    value: "R$ 1.200,00",
  },
  {
    id: "OS-003",
    client: "Pedro Oliveira",
    vehicle: "Ford Ka 2021",
    plate: "GHI-9012",
    service: "Alinhamento e balanceamento",
    status: "concluido",
    date: "2024-01-13",
    value: "R$ 280,00",
  },
  {
    id: "OS-004",
    client: "Ana Costa",
    vehicle: "Volkswagen Gol 2018",
    plate: "JKL-3456",
    service: "Troca de pastilhas de freio",
    status: "em_andamento",
    date: "2024-01-15",
    value: "R$ 680,00",
  },
  {
    id: "OS-005",
    client: "Carlos Souza",
    vehicle: "Fiat Uno 2017",
    plate: "MNO-7890",
    service: "Troca de pneus",
    status: "aguardando",
    date: "2024-01-14",
    value: "R$ 1.800,00",
  },
];

const statusConfig = {
  em_andamento: { label: "Em Andamento", variant: "default" as const, icon: Clock },
  aguardando: { label: "Aguardando", variant: "secondary" as const, icon: AlertCircle },
  concluido: { label: "Concluído", variant: "outline" as const, icon: CheckCircle2 },
};

export default function Ordens() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = orders.filter(
    (order) =>
      order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Gerencie todas as ordens de serviço</p>
          </div>
          <Button className="gap-2 bg-gradient-accent hover:opacity-90">
            <Plus className="w-4 h-4" />
            Nova Ordem
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por cliente, placa ou número da OS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const StatusIcon = statusConfig[order.status].icon;
            return (
              <Card key={order.id} className="border-border shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-1">{order.id}</h3>
                      <Badge variant={statusConfig[order.status].variant} className="gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[order.status].label}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{order.value}</p>
                      <p className="text-xs text-muted-foreground">{order.date}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="text-sm font-medium text-foreground">{order.client}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Veículo</p>
                      <p className="text-sm font-medium text-foreground">
                        {order.vehicle} - {order.plate}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Serviço</p>
                      <p className="text-sm font-medium text-foreground">{order.service}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver Detalhes
                    </Button>
                    <Button size="sm" className="flex-1">
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
