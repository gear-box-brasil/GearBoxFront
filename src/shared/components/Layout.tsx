/*
 * Gear Box – Sistema de Gestão para Oficinas Mecânicas
 * Copyright (C) 2025 Gear Box
 *
 * Este arquivo é parte do Gear Box.
 * O Gear Box é software livre: você pode redistribuí-lo e/ou modificá-lo
 * sob os termos da GNU Affero General Public License, versão 3,
 * conforme publicada pela Free Software Foundation.
 *
 * Este programa é distribuído na esperança de que seja útil,
 * mas SEM QUALQUER GARANTIA; sem mesmo a garantia implícita de
 * COMERCIABILIDADE ou ADEQUAÇÃO A UM DETERMINADO FIM.
 * Consulte a GNU AGPLv3 para mais detalhes.
 *
 * Você deve ter recebido uma cópia da GNU AGPLv3 junto com este programa.
 * Caso contrário, veja <https://www.gnu.org/licenses/>.
 */

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
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const navigationItems = (t: (key: string) => string) => [
  {
    name: t("navigation.dashboard"),
    href: "/",
    icon: LayoutDashboard,
    roles: ["dono", "mecanico", "demo"],
  },
  {
    name: t("navigation.orders"),
    href: "/ordens",
    icon: Wrench,
    roles: ["dono", "mecanico", "demo"],
  },
  {
    name: t("navigation.budgets"),
    href: "/orcamentos",
    icon: FileText,
    roles: ["dono", "mecanico", "demo"],
  },
  {
    name: t("navigation.clients"),
    href: "/clientes",
    icon: Users,
    roles: ["dono", "mecanico", "demo"],
  },
  {
    name: t("navigation.vehicles"),
    href: "/veiculos",
    icon: Car,
    roles: ["dono", "mecanico", "demo"],
  },
  {
    name: t("navigation.ownerPanel"),
    href: "/owner-dashboard",
    icon: Shield,
    roles: ["dono", "demo"],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();
  const SIDEBAR_WIDTH = {
    expanded: 260,
    collapsed: 80,
  };

  const navigation = useMemo(
    () =>
      navigationItems(t).filter((item) =>
        item.roles.includes(user?.role ?? "mecanico"),
      ),
    [t, user?.role],
  );

  const roleLabel: Record<"dono" | "mecanico" | "demo", string> = {
    dono: t("common.roles.owner"),
    mecanico: t("common.roles.mechanic"),
    demo: t("common.roles.demo"),
  };

  const ariaLabel = collapsed
    ? t("common.actions.expandMenu", { defaultValue: "Expandir menu" })
    : t("common.actions.collapseMenu", { defaultValue: "Recolher menu" });
  const logoutLabel = t("common.actions.logout");

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
      className="min-h-screen bg-background transition-[padding-left] duration-300 ease-in-out relative isolate"
      style={{
        paddingLeft: window.innerWidth >= 768 ? `${contentOffset}px` : "0px",
      }}
    >
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent dark:from-slate-900 dark:via-slate-950 dark:to-black -z-20 pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 dark:opacity-100 -z-20 pointer-events-none" />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <Logo size="sm" />
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "sidebar-shell z-50 transition-transform duration-300 ease-in-out",
          // Mobile behavior
          "fixed inset-y-0 left-0 w-[260px]",
          !mobileOpen && "-translate-x-full md:translate-x-0",
          // Desktop behavior
          "md:translate-x-0",
          collapsed ? "md:w-[80px]" : "md:w-[260px]",
        )}
        style={{
          width: undefined, // Let classes handle width
        }}
        aria-label={t("navigation.dashboard")}
      >
        <div className="flex flex-col flex-1">
          <div className="sidebar-brand">
            <div className="sidebar-logo-row">
              <Logo
                size="md"
                className={cn(
                  "sidebar-logo",
                  collapsed && "md:h-[28px]", // Only apply collapsed height on desktop
                )}
              />
              {(!collapsed || mobileOpen) && (
                <span className="sidebar-brand-title">{appName}</span>
              )}
            </div>
            {/* Close button for mobile */}
            <button
              className="absolute top-4 right-4 md:hidden text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <PanelLeftClose className="w-6 h-6" />
            </button>
          </div>

          <nav
            className="sidebar-nav flex-1 space-y-1"
            role="navigation"
            aria-label={t("navigation.dashboard")}
          >
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                onClick={() => setMobileOpen(false)} // Close on navigate
              >
                {({ isActive }) => (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center rounded-lg transition-all font-medium",
                          collapsed && !mobileOpen
                            ? "justify-center px-2 py-3"
                            : "justify-start gap-3 px-4 py-3",
                          isActive
                            ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-icon-active)] shadow-sm"
                            : "text-[var(--sidebar-icon-inactive)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]",
                        )}
                        aria-label={item.name}
                      >
                        <item.icon
                          className={cn(
                            "w-5 h-5 transition-colors",
                            collapsed && !mobileOpen && "mx-auto",
                            isActive
                              ? "text-[var(--sidebar-icon-active)]"
                              : "text-[var(--sidebar-icon-inactive)]",
                          )}
                        />
                        {(!collapsed || mobileOpen) && (
                          <span className="ml-2 text-[var(--sidebar-text)]">
                            {item.name}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    {collapsed && !mobileOpen && (
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    )}
                  </Tooltip>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="mb-3">
            {(!collapsed || mobileOpen) && (
              <p className="text-xs text-muted-foreground mb-1.5 px-1">
                {t("language.label")}
              </p>
            )}
            <LanguageSwitcher collapsed={collapsed && !mobileOpen} />
          </div>
          <div
            className={cn(
              "sidebar-user",
              collapsed && !mobileOpen && "sidebar-user--collapsed",
            )}
          >
            <div className="sidebar-user-avatar">
              <span className="text-sm font-semibold text-accent-foreground">
                {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            {(!collapsed || mobileOpen) && (
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
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "sidebar-logout",
                  collapsed && !mobileOpen && "sidebar-logout--collapsed",
                )}
                aria-label={logoutLabel}
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 text-[var(--sidebar-logout-icon)]" />
                {(!collapsed || mobileOpen) && <span>{logoutLabel}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && !mobileOpen && (
              <TooltipContent side="right">{logoutLabel}</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn("sidebar-toggle", "hidden md:flex")}
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
        </TooltipTrigger>
        <TooltipContent side="right">{ariaLabel}</TooltipContent>
      </Tooltip>

      <div className="flex flex-col min-h-screen pt-16 md:pt-0">
        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
