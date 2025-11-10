import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  Users,
  Car,
  UserCog,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["dono", "mecanico"],
  },
  {
    name: "Ordens de Serviço",
    href: "/ordens",
    icon: Wrench,
    roles: ["dono", "mecanico"],
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users,
    roles: ["dono", "mecanico"],
  },
  {
    name: "Veículos",
    href: "/veiculos",
    icon: Car,
    roles: ["dono", "mecanico"],
  },
  { name: "Usuários", href: "/usuarios", icon: UserCog, roles: ["dono"] },
];

const roleLabel: Record<"dono" | "mecanico", string> = {
  dono: "Dono",
  mecanico: "Mecânico",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const SIDEBAR_WIDTH = {
    expanded: 260,
    collapsed: 80,
  };

  const navigation = navigationItems.filter((item) =>
    item.roles.includes(user?.role ?? "mecanico")
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  const sidebarPixelWidth = collapsed
    ? SIDEBAR_WIDTH.collapsed
    : SIDEBAR_WIDTH.expanded;
  const contentOffset = sidebarPixelWidth + 24;

  return (
    <div
      className="min-h-screen bg-background transition-[padding-left] duration-300 ease-in-out"
      style={{ paddingLeft: `${contentOffset}px` }}
    >
      <aside
        className="sidebar-shell"
        style={{ width: `${sidebarPixelWidth}px` }}
      >
        <div className="flex flex-col flex-1">
          <div className="sidebar-brand">
            <div className="sidebar-logo-row">
              <Logo
                size="md"
                className={cn(
                  "sidebar-logo",
                  collapsed
                    ? "sidebar-logo--collapsed"
                    : "sidebar-logo--expanded"
                )}
              />
              {!collapsed && (
                <span className="sidebar-brand-title">Gear Box</span>
              )}
            </div>
          </div>

          <nav className="sidebar-nav flex-1 space-y-1">
            {navigation.map((item) => (
              <NavLink key={item.name} to={item.href} end={item.href === "/"}>
                {({ isActive }) => (
                  <div
                    className={cn(
                      "flex items-center rounded-lg transition-all font-medium",
                      collapsed
                        ? "justify-center px-2 py-3"
                        : "justify-start gap-3 px-4 py-3",
                      isActive
                        ? "bg-[rgba(245,163,0,0.15)] text-[var(--sidebar-icon-active)] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                        : "text-[var(--sidebar-icon-inactive)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-colors",
                        collapsed && "mx-auto",
                        isActive
                          ? "text-[var(--sidebar-icon-active)]"
                          : "text-[var(--sidebar-icon-inactive)]"
                      )}
                    />
                    {!collapsed && (
                      <span className="ml-2 text-[var(--sidebar-text)]">
                        {item.name}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div
            className={cn(
              "sidebar-user",
              collapsed && "sidebar-user--collapsed"
            )}
          >
            <div className="sidebar-user-avatar">
              <span className="text-sm font-semibold text-accent-foreground">
                {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="sidebar-user-name truncate">
                  {user?.name ?? "Usuário"}
                </p>
                <p className="sidebar-user-role truncate">
                  {user ? roleLabel[user.role] : "Usuário"}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            className={cn(
              "sidebar-logout",
              collapsed && "sidebar-logout--collapsed"
            )}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 text-[var(--sidebar-logout-icon)]" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="sidebar-toggle"
        style={{
          left: `${sidebarPixelWidth + 10}px`,
          top: "40px",
        }}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-pressed={!collapsed}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        {collapsed ? (
          <PanelLeftOpen className="w-4 h-4" />
        ) : (
          <PanelLeftClose className="w-4 h-4" />
        )}
      </button>

      <main className="min-h-screen px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
