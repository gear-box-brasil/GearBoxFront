import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wrench, Users, Car, UserCog, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ['dono', 'mecanico'] },
  { name: "Ordens de Serviço", href: "/ordens", icon: Wrench, roles: ['dono', 'mecanico'] },
  { name: "Clientes", href: "/clientes", icon: Users, roles: ['dono', 'mecanico'] },
  { name: "Veículos", href: "/veiculos", icon: Car, roles: ['dono', 'mecanico'] },
  { name: "Usuários", href: "/usuarios", icon: UserCog, roles: ['dono'] },
];

const roleLabel: Record<'dono' | 'mecanico', string> = {
  dono: 'Dono',
  mecanico: 'Mecânico',
};

export default function Layout() {
  const { user, logout, isOwner } = useAuth();
  const navigate = useNavigate();

  const navigation = navigationItems.filter((item) =>
    item.roles.includes(user?.role ?? 'mecanico')
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-md">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">AutoGest</h1>
                <p className="text-xs text-muted-foreground">Mecânica Pro</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    "text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-accent-foreground">
                  {(user?.name?.charAt(0)?.toUpperCase() ?? '?')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user ? roleLabel[user.role] : 'Usuário'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="pl-64">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
