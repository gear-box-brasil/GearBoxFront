import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wrench, Users, Car, UserCog, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navigation = navigationItems.filter((item) =>
    item.roles.includes(user?.role ?? 'mecanico')
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const sidebarWidth = collapsed ? "w-20" : "w-64";
  const sidebarPixelWidth = collapsed ? 80 : 256;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn("sidebar-metal fixed inset-y-0 left-0 z-50 border-r border-border shadow-md transition-all duration-300", sidebarWidth)}>
        <div className="flex flex-col h-full relative">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-border gap-3">
            <div className={cn(
              "flex items-center gap-3 transition-all",
              collapsed ? "justify-center w-full" : "flex-1"
            ) }
            >
              <Logo size={collapsed ? "sm" : "md"} className="transition-all" />
              {!collapsed && (
                <div className="transition-opacity">
                  <p className="text-xs uppercase tracking-wide text-[hsl(var(--primary))] leading-tight">
                    Painel
                  </p>
                  <h1 className="text-lg font-bold text-foreground leading-tight">Gear Box</h1>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((prev) => !prev)}
              className="h-8 w-8 rounded-full border border-border bg-card shadow-sm text-muted-foreground hover:text-foreground ml-auto"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 py-6 space-y-1", collapsed ? "px-2" : "px-4") }>
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-lg transition-all font-medium",
                    collapsed ? "justify-center px-2 py-3" : "justify-start gap-3 px-4 py-3",
                    isActive
                      ? "bg-[rgba(245,163,0,0.15)] text-[hsl(var(--primary))] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[#21272A] hover:text-[hsl(var(--foreground))]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-colors",
                        collapsed && "mx-auto",
                        isActive
                          ? "text-[hsl(var(--primary))]"
                          : "text-[hsl(var(--muted-foreground))]"
                      )}
                    />
                    {!collapsed && <span className="ml-3">{item.name}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className={cn("p-4 border-t border-border space-y-3", collapsed && "px-2") }>
            <div className={cn("flex items-center gap-3 px-3 py-2", collapsed && "justify-center") }>
              <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-accent-foreground">
                  {(user?.name?.charAt(0)?.toUpperCase() ?? '?')}
                </span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user ? roleLabel[user.role] : 'Usuário'}
                  </p>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("w-full gap-2", collapsed ? "justify-center" : "justify-start")}
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && 'Sair'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className="transition-[padding] duration-300"
        style={{ paddingLeft: `calc(${sidebarPixelWidth}px + 24px)` }}
      >
        <main className="min-h-screen px-6 md:px-10 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
