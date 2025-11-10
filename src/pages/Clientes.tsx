import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { listClients } from '@/services/gearbox';
import { Loader2 } from 'lucide-react';

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const { token } = useAuth();

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['clients', token, page],
    queryFn: () => listClients(token!, { page, perPage: 12 }),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const clients = data?.data ?? [];
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const term = searchTerm.toLowerCase();
      return (
        client.nome.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.telefone.includes(searchTerm)
      );
    });
  }, [clients, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Clientes</h1>
            <p className="text-muted-foreground">Dados vindos diretamente da Gear Box API</p>
          </div>
          <Button className="gap-2 bg-gradient-accent hover:opacity-90" disabled>
            <Plus className="w-4 h-4" />
            Cadastro em breve
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando clientes...
          </div>
        ) : isError ? (
          <p className="text-destructive">{error instanceof Error ? error.message : 'Erro ao carregar clientes'}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Card key={client.id} className="border-border shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</p>
                      <h3 className="text-lg font-bold text-foreground">{client.nome}</h3>
                      <p className="text-xs text-muted-foreground">ID: {client.id}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                          <p className="text-sm text-foreground truncate">
                            {client.email ?? 'Não informado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">Telefone</p>
                          <p className="text-sm text-foreground">{client.telefone}</p>
                        </div>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-xs">
                      Criado em {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {data?.meta && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Página {data.meta.currentPage} de {data.meta.lastPage} · {data.meta.total} clientes
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isFetching}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === data.meta.lastPage || isFetching}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
