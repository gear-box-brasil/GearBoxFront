import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, Gauge } from "lucide-react";

const vehicles = [
  {
    id: "1",
    brand: "Honda",
    model: "Civic",
    year: "2020",
    plate: "ABC-1234",
    color: "Preto",
    owner: "João Silva",
    km: "45.000 km",
    lastService: "15/01/2024",
  },
  {
    id: "2",
    brand: "Toyota",
    model: "Corolla",
    year: "2019",
    plate: "DEF-5678",
    color: "Prata",
    owner: "Maria Santos",
    km: "62.000 km",
    lastService: "14/01/2024",
  },
  {
    id: "3",
    brand: "Ford",
    model: "Ka",
    year: "2021",
    plate: "GHI-9012",
    color: "Branco",
    owner: "Pedro Oliveira",
    km: "28.000 km",
    lastService: "13/01/2024",
  },
  {
    id: "4",
    brand: "Volkswagen",
    model: "Gol",
    year: "2018",
    plate: "JKL-3456",
    color: "Vermelho",
    owner: "Ana Costa",
    km: "78.000 km",
    lastService: "15/01/2024",
  },
  {
    id: "5",
    brand: "Fiat",
    model: "Uno",
    year: "2017",
    plate: "MNO-7890",
    color: "Azul",
    owner: "Carlos Souza",
    km: "95.000 km",
    lastService: "14/01/2024",
  },
  {
    id: "6",
    brand: "Chevrolet",
    model: "Onix",
    year: "2022",
    plate: "PQR-2468",
    color: "Prata",
    owner: "Ana Costa",
    km: "15.000 km",
    lastService: "12/01/2024",
  },
];

const colorMap: Record<string, string> = {
  Preto: "bg-gray-900",
  Prata: "bg-gray-400",
  Branco: "bg-gray-100 border",
  Vermelho: "bg-red-600",
  Azul: "bg-blue-600",
};

export default function Veiculos() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Veículos</h1>
            <p className="text-muted-foreground">Gerencie todos os veículos cadastrados</p>
          </div>
          <Button className="gap-2 bg-gradient-accent hover:opacity-90">
            <Plus className="w-4 h-4" />
            Novo Veículo
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por marca, modelo, placa ou proprietário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="border-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{vehicle.year}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {vehicle.plate}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full ${colorMap[vehicle.color]}`} />
                        <span className="text-xs text-muted-foreground">{vehicle.color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Proprietário</p>
                    <p className="text-sm font-medium text-foreground">{vehicle.owner}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Quilometragem</p>
                        <p className="text-sm font-medium text-foreground">{vehicle.km}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Último serviço</p>
                        <p className="text-sm font-medium text-foreground">{vehicle.lastService}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Histórico
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
