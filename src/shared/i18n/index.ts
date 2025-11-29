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

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "@/locales/ptBR.json";
import enUS from "@/locales/enUS.json";

const STORAGE_KEY = "gearbox_locale";
const fallbackLng = "pt-BR";
const SUPPORTED_LANGUAGES = ["pt-BR", "en-US"] as const;

const normalizeLanguage = (value?: string | null): string => {
  if (!value) return fallbackLng;
  const normalized = value.toLowerCase();
  if (normalized.startsWith("en")) return "en-US";
  if (normalized.startsWith("pt")) return "pt-BR";
  return fallbackLng;
};

const stored =
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
const browserLng =
  typeof navigator !== "undefined" ? navigator.language : fallbackLng;
const initialLng = normalizeLanguage(stored || browserLng);

i18n.use(initReactI18next).init({
  lng: initialLng,
  fallbackLng,
  resources: {
    "pt-BR": { translation: ptBR },
    "en-US": { translation: enUS },
  },
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export function setLanguage(lng: string) {
  const next = normalizeLanguage(lng);
  i18n.changeLanguage(next);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, next);
  }
}

export function getLanguage() {
  return normalizeLanguage(i18n.language);
}

export { normalizeLanguage, SUPPORTED_LANGUAGES };

export default i18n;
