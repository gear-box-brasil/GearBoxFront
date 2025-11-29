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

import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { setLanguage, getLanguage } from "@/shared/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  collapsed,
  className,
}: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const current = getLanguage();
  const label = t("language.label");

  const handleChange = (value: string) => {
    setLanguage(value);
  };

  const FLAGS: Record<string, string> = {
    "pt-BR": "🇧🇷",
    "en-US": "🇺🇸",
    ptBR: "🇧🇷",
    enUS: "🇺🇸",
  };

  const LABELS: Record<string, string> = {
    "pt-BR": t("language.portuguese"),
    "en-US": t("language.english"),
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          "w-full transition-all duration-200 border border-[var(--sidebar-border-color)] bg-transparent hover:bg-[var(--sidebar-hover-bg)]",
          collapsed
            ? "justify-center px-0 border-none h-10 w-10 mx-auto [&>svg]:hidden"
            : "justify-between px-3",
          className,
        )}
        style={{
          color: "var(--sidebar-text)",
        }}
        aria-label={label}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="text-base leading-none shrink-0 grayscale-[0.2] hover:grayscale-0 transition-all">
            {FLAGS[current] || "🌐"}
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-medium opacity-90">
              {LABELS[current]}
            </span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="border-[var(--sidebar-border-color)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]">
        <SelectItem
          value="pt-BR"
          className="focus:bg-[var(--sidebar-hover-bg)] focus:text-[var(--sidebar-text)]"
        >
          <span className="flex items-center gap-2">
            <span>🇧🇷</span> {t("language.portuguese")}
          </span>
        </SelectItem>
        <SelectItem
          value="en-US"
          className="focus:bg-[var(--sidebar-hover-bg)] focus:text-[var(--sidebar-text)]"
        >
          <span className="flex items-center gap-2">
            <span>🇺🇸</span> {t("language.english")}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
