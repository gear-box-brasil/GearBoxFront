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

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartPlaceholder } from "./ChartPlaceholder";
import { KpiCards } from "./KpiCards";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/shared/hooks/use-mobile";

const COLORS = {
  text: "#e2e8f0",
  textDark: "#0f172a",
  grid: "rgba(148,163,184,0.2)",
  axis: "rgba(148,163,184,0.4)",
  budgets: "#f5a300",
  concluded: "#38BDF8",
  accepted: "#A855F7",
  cancelled: "#F43F5E",
  ticket: "#22c55e",
  baseline: "#94a3b8",
};

const SERIES_COLORS = [
  COLORS.budgets,
  COLORS.concluded,
  COLORS.accepted,
  COLORS.cancelled,
  "#22d3ee",
  "#c084fc",
  "#34d399",
  "#818cf8",
];

const METRICS = [
  { label: "Orçamentos recebidos", color: COLORS.budgets, key: "budgets" },
  { label: "Serviços concluídos", color: COLORS.concluded, key: "services" },
  { label: "Taxa de aceitação", color: COLORS.accepted, key: "acceptRate" },
  { label: "Taxa de cancelamento", color: COLORS.cancelled, key: "cancelRate" },
  { label: "Ticket médio", color: COLORS.ticket, key: "ticketAverage" },
];

const formatNumber = (value) => (value ?? 0).toLocaleString("pt-BR");
const formatCurrency = (value) =>
  typeof value === "number"
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(Math.round(value))
    : "—";

const hexToRgba = (hex, alpha = 1) => {
  const sanitized = hex.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;
  const numeric = parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const normalizeToPercent = (value, max) => {
  if (!max) return 0;
  return Math.min(100, Math.round(((value ?? 0) / max) * 100));
};

import { useTheme } from "next-themes";

// ...

export function MechanicsComparisonChart({
  data = [],
  loading = false,
  kpis = [],
  averageProfile = null,
  topPerformer = null,
  period,
  selectedId,
  onSelect,
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const textColor = isDark ? COLORS.text : COLORS.textDark;
  const hasData = data.length > 0;

  const preparedSeries = useMemo(() => {
    const budgetsMax = Math.max(
      1,
      ...data.map((item) => item.budgets ?? 0),
      averageProfile?.budgets ?? 0,
      topPerformer?.budgets ?? 0
    );
    const servicesMax = Math.max(
      1,
      ...data.map((item) => item.services ?? 0),
      averageProfile?.services ?? 0,
      topPerformer?.services ?? 0
    );
    const ticketMax = Math.max(
      1,
      ...data.map((item) => item.ticketAverage ?? 0),
      averageProfile?.ticketAverage ?? 0,
      topPerformer?.ticketAverage ?? 0
    );

    const buildSeriesEntry = (item, index, customName) => {
      const name = customName ?? item.name;
      const color = customName
        ? COLORS.baseline
        : SERIES_COLORS[index % SERIES_COLORS.length];
      const meta = {
        budgets: Math.round(item.budgets ?? 0),
        services: Math.round(item.services ?? 0),
        accepted: Math.round(item.accepted ?? 0),
        cancelled: Math.round(item.cancelled ?? 0),
        acceptRate: Math.round(item.acceptRate ?? 0),
        cancelRate: Math.round(item.cancelRate ?? 0),
        ticketAverage: item.ticketAverage ?? null,
      };

      const values = [
        normalizeToPercent(meta.budgets, budgetsMax),
        normalizeToPercent(meta.services, servicesMax),
        Math.min(100, meta.acceptRate),
        Math.min(100, meta.cancelRate),
        normalizeToPercent(meta.ticketAverage ?? 0, ticketMax),
      ];

      return {
        name,
        type: "radar",
        symbol: "circle",
        symbolSize: 5,
        lineStyle: {
          width: customName ? 2 : 2.2,
          color,
          type: customName ? "dashed" : "solid",
        },
        itemStyle: { color },
        areaStyle: customName ? undefined : { color: hexToRgba(color, 0.16) },
        data: [{ value: values, name, meta }],
      };
    };

    const seriesEntries = data.map((item, index) =>
      buildSeriesEntry(item, index)
    );
    if (averageProfile) {
      seriesEntries.push(
        buildSeriesEntry(averageProfile, seriesEntries.length, "Média geral")
      );
    }
    if (topPerformer) {
      seriesEntries.push(
        buildSeriesEntry(topPerformer, seriesEntries.length, "Top performer")
      );
    }

    const legendItems = seriesEntries.map((series) => series.name);

    return { seriesEntries, legendItems };
  }, [averageProfile, data, topPerformer]);

  const chartOption = useMemo(() => {
    const { seriesEntries, legendItems } = preparedSeries;

    const tooltipFormatter = (params) => {
      const entries = Array.isArray(params) ? params : [params];
      return entries
        .map((entry) => {
          const meta = entry?.data?.meta ?? {};
          const metricRows = [
            {
              label: "Orçamentos recebidos",
              value: formatNumber(meta.budgets),
            },
            { label: "Aprovações", value: formatNumber(meta.accepted) },
            {
              label: "Serviços concluídos",
              value: formatNumber(meta.services),
            },
            { label: "Cancelamentos", value: formatNumber(meta.cancelled) },
            { label: "Taxa de aceitação", value: `${meta.acceptRate ?? 0}%` },
            {
              label: "Taxa de cancelamento",
              value: `${meta.cancelRate ?? 0}%`,
            },
            {
              label: "Ticket médio",
              value: formatCurrency(meta.ticketAverage),
            },
          ]
            .map(
              (metric) =>
                `<div>${metric.label}: <span class="font-semibold">${metric.value}</span></div>`
            )
            .join("");

          return `<div class="text-xs font-semibold mb-1">${entry.name}</div><div class="text-xs leading-relaxed space-y-1">${metricRows}</div>`;
        })
        .join("<br/>");
    };

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: tooltipFormatter,
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.95)",
        textStyle: { color: "#e2e8f0", fontFamily: "Inter, sans-serif" },
        extraCssText:
          "box-shadow: 0 12px 32px rgba(0,0,0,0.35); border-radius: 12px;",
      },
      legend: {
        data: legendItems,
        bottom: 0,
        left: "center",
        icon: "circle",
        textStyle: {
          color: textColor,
          fontSize: 14,
          fontFamily: "Inter, sans-serif",
        },
        itemGap: 20,
      },
      radar: {
        center: ["50%", "45%"],
        radius: "65%",
        splitNumber: 5,
        shape: "circle",
        indicator: METRICS.map((metric) => ({
          name: metric.label,
          max: 100,
          min: 0,
          color: metric.color,
        })),
        name: {
          textStyle: {
            color: textColor,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
          },
          gap: 10,
        },
        axisLine: {
          lineStyle: { color: isDark ? COLORS.axis : "rgba(148,163,184,0.6)" },
        },
        splitLine: {
          lineStyle: { color: isDark ? COLORS.grid : "rgba(148,163,184,0.3)" },
        },
        splitArea: { areaStyle: { color: ["transparent"] } },
      },
      series: seriesEntries,
    };
  }, [preparedSeries, textColor, isDark]);

  const renderTable = () => {
    if (!hasData) return null;

    if (isMobile) {
      return (
        <div className="mt-4 flex flex-col gap-4">
          {data.map((row) => (
            <Card
              key={row.id ?? row.name}
              className={cn(
                "p-4 border border-border/50",
                selectedId && row.id === selectedId ? "bg-muted/30" : ""
              )}
              onClick={() => row.id && onSelect?.(row.id)}
            >
              <div className="flex flex-col gap-3">
                <div className="font-medium text-lg">{row.name}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">
                      Métricas
                    </div>
                    <div>Orçamentos: {formatNumber(row.budgets ?? 0)}</div>
                    <div>Aprovações: {formatNumber(row.accepted ?? 0)}</div>
                    <div>Concluídos: {formatNumber(row.services ?? 0)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground text-xs uppercase">
                      Performance
                    </div>
                    <div>Aceitação: {row.acceptRate ?? 0}%</div>
                    <div>Cancelamento: {row.cancelRate ?? 0}%</div>
                    <div>Ticket: {formatCurrency(row.ticketAverage)}</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="mt-4 overflow-x-auto">
        <Table className="min-w-[860px] text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Mecânico</TableHead>
              <TableHead>Orçamentos</TableHead>
              <TableHead>Aprovações</TableHead>
              <TableHead>Concluídos</TableHead>
              <TableHead>Taxa de aceitação</TableHead>
              <TableHead>Taxa de cancelamento</TableHead>
              <TableHead>Ticket médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={row.id ?? row.name}
                className={
                  selectedId && row.id === selectedId ? "bg-muted/30" : ""
                }
                onClick={() => row.id && onSelect?.(row.id)}
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{formatNumber(row.budgets ?? 0)}</TableCell>
                <TableCell>{formatNumber(row.accepted ?? 0)}</TableCell>
                <TableCell>{formatNumber(row.services ?? 0)}</TableCell>
                <TableCell>{`${row.acceptRate ?? 0}%`}</TableCell>
                <TableCell>{`${row.cancelRate ?? 0}%`}</TableCell>
                <TableCell>{formatCurrency(row.ticketAverage)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="border-border shadow-sm bg-card/80">
      <CardHeader className="space-y-4 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">
              {t("owner.charts.mechanicsComparison.title")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("owner.charts.mechanicsComparison.subtitle")}{" "}
              {period?.label ? `(${period.label})` : ""}
            </p>
          </div>
          {period?.options && (
            <div className="w-full sm:w-48">
              <Select value={period.value} onValueChange={period.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {period.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {kpis?.length ? <KpiCards metrics={kpis} /> : null}
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div style={{ height: "520px", width: "100%" }}>
          {loading ? (
            <ChartPlaceholder loading title={t("charts.placeholder.loading")} />
          ) : !hasData ? (
            <ChartPlaceholder
              title={t("owner.charts.mechanicsComparison.noData")}
              description={t("owner.charts.mechanicsComparison.noDataDesc")}
            />
          ) : (
            <ReactECharts
              option={chartOption}
              notMerge
              lazyUpdate
              style={{ height: "100%" }}
            />
          )}
        </div>
        {renderTable()}
      </CardContent>
    </Card>
  );
}
