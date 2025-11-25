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
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ChartPlaceholder } from "./ChartPlaceholder";
import { KpiCards } from "./KpiCards";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/shared/hooks/use-mobile";

const STATUS_COLORS = {
  aberto: "#f5a300",
  aceito: "#38BDF8",
  cancelado: "#F43F5E",
  concluido: "#F472B6",
};

const formatPercentLabel = (value) =>
  typeof value === "number" ? `${value.toFixed(1)}%` : "0%";

export function BudgetStatusChart({
  data = [],
  kpis = [],
  loading = false,
  period,
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";
  const textColor = isDark ? "#e2e8f0" : "#0f172a";

  const total = useMemo(
    () => data.reduce((sum, item) => sum + (item.value ?? 0), 0),
    [data]
  );
  const hasData = total > 0;

  const chartOption = useMemo(() => {
    const chartData = data.map((item) => ({
      value: item.value ?? 0,
      name: item.label,
      key: item.key,
      percent: item.percent ?? 0,
      itemStyle: { color: STATUS_COLORS[item.key] || STATUS_COLORS.aberto },
    }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const percent = params.data.percent ?? 0;
          return `<div class="text-xs font-semibold mb-1">${params.name}</div>
            <div class="text-xs leading-relaxed">
              <div>${params.value} ${t(
                "navigation.budgets"
              ).toLowerCase()}</div>
              <div>${percent}% ${t("common.totalLabel").toLowerCase()}</div>
            </div>`;
        },
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.95)",
        textStyle: { color: "#e2e8f0" },
      },
      grid: { left: 10, right: 10, bottom: 16, top: 28, containLabel: true },
      xAxis: {
        type: "value",
        axisLabel: { color: textColor, fontSize: 12 },
        splitLine: {
          lineStyle: {
            color: isDark ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.4)",
          },
        },
      },
      yAxis: {
        type: "category",
        data: data.map((item) => item.label),
        axisLabel: { color: textColor, fontSize: 12 },
      },
      series: [
        {
          type: "bar",
          barWidth: 18,
          data: chartData,
          label: {
            show: true,
            position: "right",
            color: textColor,
            formatter: ({ data }) =>
              `${data.value} (${formatPercentLabel(data.percent)})`,
            fontSize: 11,
          },
          itemStyle: {
            borderRadius: 8,
          },
        },
      ],
    };
  }, [data]);

  const renderLegend = () => (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {data.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              background: STATUS_COLORS[item.key] || STATUS_COLORS.aberto,
            }}
            aria-hidden
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );

  const renderTable = () => {
    if (!hasData) return null;

    if (isMobile) {
      return (
        <div className="flex flex-col gap-4">
          {data.map((row) => {
            const changePositive =
              typeof row.change === "number" && row.change > 0;
            const changeNegative =
              typeof row.change === "number" && row.change < 0;
            return (
              <Card key={row.key} className="p-4 border border-border/50">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{row.label}</div>
                    <div className="font-bold text-lg">{row.value ?? 0}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-muted-foreground">
                      {formatPercentLabel(row.percent)} do total
                    </div>
                    <div className="flex items-center gap-1">
                      {typeof row.change === "number" ? (
                        <>
                          {changePositive ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : changeNegative ? (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          ) : null}
                          <span
                            className={
                              changePositive
                                ? "text-green-500"
                                : changeNegative
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                            }
                          >
                            {row.change > 0 ? "+" : ""}
                            {row.change} pp
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table className="min-w-[720px] text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>{t("owner.charts.status.table.status")}</TableHead>
              <TableHead>{t("owner.charts.status.table.quantity")}</TableHead>
              <TableHead>{t("owner.charts.status.table.percent")}</TableHead>
              <TableHead>{t("owner.charts.status.table.change")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const changePositive =
                typeof row.change === "number" && row.change > 0;
              const changeNegative =
                typeof row.change === "number" && row.change < 0;
              return (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell>{row.value ?? 0}</TableCell>
                  <TableCell>{formatPercentLabel(row.percent)}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    {typeof row.change === "number" ? (
                      <>
                        {changePositive ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : changeNegative ? (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        ) : null}
                        <span
                          className={
                            changePositive
                              ? "text-green-500"
                              : changeNegative
                                ? "text-red-500"
                                : "text-muted-foreground"
                          }
                        >
                          {row.change > 0 ? "+" : ""}
                          {row.change} pp
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
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
              {t("owner.charts.status.title")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("owner.charts.status.subtitle")}{" "}
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
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center justify-between">
          {renderLegend()}
          <span className="text-xs text-muted-foreground">
            Total: {total} budgets
          </span>
        </div>
        <div style={{ height: "360px", width: "100%" }}>
          {loading ? (
            <ChartPlaceholder loading title="Carregando dados..." />
          ) : !hasData ? (
            <ChartPlaceholder
              title="Nenhum status registrado"
              description="Assim que surgirem budgets, o status consolidado aparecerá aqui."
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
