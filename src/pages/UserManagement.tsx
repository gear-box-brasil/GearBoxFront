import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';
import { createUser } from '@/services/gearbox';
import type { Role } from '@/types/api';

export default function UserManagement() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('mecanico');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para cadastrar usuários.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await createUser(token, {
        nome: name,
        email,
        senha: password,
        tipo: role,
      });

      toast({
        title: 'Usuário cadastrado',
        description: `${name} foi cadastrado com sucesso como ${role === 'dono' ? 'dono' : 'mecânico'}.`,
      });

      setName('');
      setEmail('');
      setPassword('');
      setRole('mecanico');
    } catch (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="heading-accent text-3xl font-bold tracking-tight text-foreground">Gestão de Usuários</h2>
        <p className="text-muted-foreground">
          Cadastre donos e mecânicos do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Cadastrar Novo Usuário</CardTitle>
          </div>
          <CardDescription>
            Preencha os dados abaixo para criar um novo usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Usuário</Label>
                <Select value={role} onValueChange={(value: Role) => setRole(value)} disabled={loading}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mecanico">Mecânico</SelectItem>
                    <SelectItem value="dono">Dono</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
