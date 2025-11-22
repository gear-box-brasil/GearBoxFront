import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  FileText,
  Users,
  Shield,
  Car,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const navigationItems = (t: (key: string) => string) => [
  {
    name: t("navigation.dashboard"),
    href: "/",
    icon: LayoutDashboard,
    roles: ["dono", "mecanico"],
  },
  {
    name: t("navigation.orders"),
    href: "/ordens",
    icon: Wrench,
    roles: ["dono", "mecanico"],
  },
  {
    name: t("navigation.budgets"),
    href: "/orcamentos",
    icon: FileText,
    roles: ["dono", "mecanico"],
  },
  {
    name: t("navigation.clients"),
    href: "/clientes",
    icon: Users,
    roles: ["dono", "mecanico"],
  },
  {
    name: t("navigation.vehicles"),
    href: "/veiculos",
    icon: Car,
    roles: ["dono", "mecanico"],
  },
  {
    name: t("navigation.ownerPanel"),
    href: "/owner-dashboard",
    icon: Shield,
    roles: ["dono"],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();
  const SIDEBAR_WIDTH = {
    expanded: 260,
    collapsed: 80,
  };

  const navigation = useMemo(
    () =>
      navigationItems(t).filter((item) =>
        item.roles.includes(user?.role ?? "mecanico")
      ),
    [t, user?.role]
  );

  const roleLabel: Record<"dono" | "mecanico", string> = {
    dono: t("common.roles.owner"),
    mecanico: t("common.roles.mechanic"),
  };

  const ariaLabel = collapsed
    ? t("common.actions.expandMenu", { defaultValue: "Expandir menu" })
    : t("common.actions.collapseMenu", { defaultValue: "Recolher menu" });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sidebarPixelWidth = collapsed
    ? SIDEBAR_WIDTH.collapsed
    : SIDEBAR_WIDTH.expanded;
  const contentOffset = sidebarPixelWidth + 24;
  const appName = t("common.appName");

  return (
    <div
      className="min-h-screen bg-background transition-[padding-left] duration-300 ease-in-out"
      style={{ paddingLeft: `${contentOffset}px` }}
    >
      <aside
        className="sidebar-shell"
        style={{ width: `${sidebarPixelWidth}px` }}
        aria-label={t("navigation.dashboard")}
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
                <span className="sidebar-brand-title">{appName}</span>
              )}
            </div>
          </div>

          <nav
            className="sidebar-nav flex-1 space-y-1"
            role="navigation"
            aria-label={t("navigation.dashboard")}
          >
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
                        ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-icon-active)] shadow-sm"
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
          <div className="mb-3">
            {!collapsed && (
              <p className="text-xs text-muted-foreground mb-1.5 px-1">
                {t("language.label")}
              </p>
            )}
            <LanguageSwitcher collapsed={collapsed} />
          </div>
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
                  {user?.name ?? t("common.empty.noData")}
                </p>
                <p className="sidebar-user-role truncate">
                  {user ? roleLabel[user.role] : t("common.roles.mechanic")}
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
            {!collapsed && <span>{t("common.actions.logout")}</span>}
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
        aria-label={ariaLabel}
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
