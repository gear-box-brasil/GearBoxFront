import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Users, Car, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const stats = [
  {
    title: "Ordens Ativas",
    value: "12",
    change: "+3 hoje",
    icon: Wrench,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Clientes",
    value: "48",
    change: "+5 este mês",
    icon: Users,
    color: "text-accent",
    bgColor: "bg-accent-light",
  },
  {
    title: "Veículos",
    value: "65",
    change: "Total cadastrado",
    icon: Car,
    color: "text-success",
    bgColor: "bg-success-light",
  },
  {
    title: "Receita Mensal",
    value: "R$ 28.450",
    change: "+12% vs mês anterior",
    icon: TrendingUp,
    color: "text-warning",
    bgColor: "bg-warning-light",
  },
];

const recentOrders = [
  {
    id: "OS-001",
    client: "João Silva",
    vehicle: "Honda Civic 2020",
    service: "Troca de óleo + Filtros",
    status: "em_andamento",
    time: "2h atrás",
  },
  {
    id: "OS-002",
    client: "Maria Santos",
    vehicle: "Toyota Corolla 2019",
    service: "Revisão completa",
    status: "aguardando",
    time: "4h atrás",
  },
  {
    id: "OS-003",
    client: "Pedro Oliveira",
    vehicle: "Ford Ka 2021",
    service: "Alinhamento e balanceamento",
    status: "concluido",
    time: "1 dia atrás",
  },
  {
    id: "OS-004",
    client: "Ana Costa",
    vehicle: "Volkswagen Gol 2018",
    service: "Troca de pastilhas de freio",
    status: "em_andamento",
    time: "5h atrás",
  },
];

const statusConfig = {
  em_andamento: { label: "Em Andamento", variant: "default" as const, icon: Clock },
  aguardando: { label: "Aguardando", variant: "secondary" as const, icon: AlertCircle },
  concluido: { label: "Concluído", variant: "outline" as const, icon: CheckCircle2 },
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da oficina</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-foreground mb-2">{stat.value}</h3>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card className="border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Ordens de Serviço Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-foreground">{order.id}</span>
                        <Badge variant={statusConfig[order.status].variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[order.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground font-medium mb-1">{order.client}</p>
                      <p className="text-xs text-muted-foreground mb-1">{order.vehicle}</p>
                      <p className="text-sm text-muted-foreground">{order.service}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{order.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
