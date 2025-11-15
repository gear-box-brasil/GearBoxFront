import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPlaceholder } from "./ChartPlaceholder";

const COLORS = {
  text: "#f8fafc",
  grid: "rgba(255,255,255,0.08)",
  axis: "rgba(255,255,255,0.25)",
  budgets: "#FFC107",
  concluded: "#38BDF8",
  accepted: "#F472B6",
  cancelled: "#F43F5E",
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
  { label: "Budgets", color: COLORS.budgets, suffix: "", richKey: "budgets" },
  {
    label: "Serviços concluídos",
    color: COLORS.concluded,
    suffix: "",
    richKey: "services",
  },
  {
    label: "Taxa de aceitação (%)",
    color: COLORS.accepted,
    suffix: "%",
    richKey: "accepted",
  },
  {
    label: "Taxa de cancelamento (%)",
    color: COLORS.cancelled,
    suffix: "%",
    richKey: "cancelled",
  },
];

const RADAR_NAME_RICH = METRICS.reduce((acc, metric) => {
  acc[metric.richKey] = {
    color: metric.color,
    fontSize: 12,
  };
  return acc;
}, {});

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

export function MechanicsComparisonChart({ data = [], loading = false }) {
  const chartOption = useMemo(() => {
    const mechanicNames = data.map((item) => item.name);
    const budgets = data.map((item) => item.budgets ?? 0);
    const concluded = data.map((item) => item.services ?? 0);

    const budgetsMax = Math.max(1, ...budgets);
    const concludedMax = Math.max(1, ...concluded);

    const indicators = [
      { name: METRICS[0].label, max: budgetsMax, min: 0, color: METRICS[0].color },
      {
        name: METRICS[1].label,
        max: concludedMax,
        min: 0,
        color: METRICS[1].color,
      },
      { name: METRICS[2].label, max: 100, min: 0, color: METRICS[2].color },
      { name: METRICS[3].label, max: 100, min: 0, color: METRICS[3].color },
    ];

    const formatTooltip = (items) => {
      const params = Array.isArray(items) ? items : [items];
      return params
        .map((param) => {
          const values = param?.data?.value ?? [];
          const metricRows = values
            .map((value, index) => {
              const metric = METRICS[index];
              const numericValue = value ?? 0;
              const formattedValue =
                metric.suffix === "%"
                  ? `${numericValue}%`
                  : numericValue;
              return `<div>${metric.label}: <span class="font-semibold">${formattedValue}</span></div>`;
            })
            .join("");
          return `<div class="text-xs font-medium mb-1">${param.name}</div><div class="text-xs leading-relaxed">${metricRows}</div>`;
        })
        .join("<br/>");
    };

    const series = data.map((item, index) => {
      const color = SERIES_COLORS[index % SERIES_COLORS.length];
      const values = [
        item.budgets ?? 0,
        item.services ?? 0,
        item.acceptRate ?? 0,
        item.cancelRate ?? 0,
      ];
      return {
        name: item.name,
        type: "radar",
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: {
          color,
        },
        areaStyle: {
          color: hexToRgba(color, 0.18),
        },
        data: [{ value: values, name: item.name }],
      };
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: formatTooltip,
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.92)",
        textStyle: { color: COLORS.text },
      },
      legend: {
        data: mechanicNames,
        top: 8,
        left: "center",
        icon: "circle",
        textStyle: { color: COLORS.text, fontSize: 12 },
      },
      radar: {
        center: ["50%", "58%"],
        radius: "70%",
        splitNumber: 4,
        shape: "circle",
        indicator: indicators,
        name: {
          formatter: (value) => {
            const metric = METRICS.find((item) => item.label === value);
            return metric ? `{${metric.richKey}|${value}}` : value;
          },
          textStyle: {
            color: COLORS.text,
            fontSize: 13,
            fontWeight: 500,
          },
          rich: RADAR_NAME_RICH,
        },
        axisLine: { lineStyle: { color: COLORS.axis } },
        splitLine: { lineStyle: { color: COLORS.grid } },
        splitArea: { areaStyle: { color: ["transparent"] } },
      },
      series,
    };
  }, [data]);

  return (
    <Card className="border-border shadow-sm bg-card/80">
      <CardHeader className="space-y-1.5 pb-0">
        <CardTitle className="text-lg">Comparativo de Mecânicos</CardTitle>
        <p className="text-xs text-muted-foreground">
          Budgets, serviços e taxas por profissional.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[380px]">
          {loading ? (
            <ChartPlaceholder loading title="Carregando dados..." />
          ) : data.length === 0 ? (
            <ChartPlaceholder
              title="Ainda sem comparativos"
              description="Cadastre mecânicos ativos e gere budgets para liberar o gráfico."
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
      </CardContent>
    </Card>
  );
}
