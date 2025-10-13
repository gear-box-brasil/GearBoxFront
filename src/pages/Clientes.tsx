import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, MapPin } from "lucide-react";

const clients = [
  {
    id: "1",
    name: "João Silva",
    email: "joao.silva@email.com",
    phone: "(11) 98765-4321",
    address: "Rua das Flores, 123 - São Paulo, SP",
    vehicles: 2,
    orders: 5,
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "(11) 97654-3210",
    address: "Av. Paulista, 456 - São Paulo, SP",
    vehicles: 1,
    orders: 3,
  },
  {
    id: "3",
    name: "Pedro Oliveira",
    email: "pedro.oliveira@email.com",
    phone: "(11) 96543-2109",
    address: "Rua Augusta, 789 - São Paulo, SP",
    vehicles: 1,
    orders: 2,
  },
  {
    id: "4",
    name: "Ana Costa",
    email: "ana.costa@email.com",
    phone: "(11) 95432-1098",
    address: "Rua Oscar Freire, 321 - São Paulo, SP",
    vehicles: 3,
    orders: 8,
  },
  {
    id: "5",
    name: "Carlos Souza",
    email: "carlos.souza@email.com",
    phone: "(11) 94321-0987",
    address: "Av. Rebouças, 654 - São Paulo, SP",
    vehicles: 1,
    orders: 1,
  },
];

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Clientes</h1>
            <p className="text-muted-foreground">Gerencie sua base de clientes</p>
          </div>
          <Button className="gap-2 bg-gradient-accent hover:opacity-90">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="border-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground mb-2">{client.name}</h3>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {client.vehicles} {client.vehicles === 1 ? "veículo" : "veículos"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {client.orders} OS
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                      <p className="text-sm text-foreground truncate">{client.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Telefone</p>
                      <p className="text-sm text-foreground">{client.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Endereço</p>
                      <p className="text-sm text-foreground">{client.address}</p>
                    </div>
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
          ))}
        </div>
      </div>
    </div>
  );
}
