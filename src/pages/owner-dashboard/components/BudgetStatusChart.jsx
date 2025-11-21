import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPlaceholder } from "./ChartPlaceholder";

const COLORS = ["#FFC107", "#38BDF8", "#F43F5E", "#F472B6"];
const TEXT_COLOR = "#f8fafc";

export function BudgetStatusChart({ data = [], loading = false }) {
  const filteredData = useMemo(
    () => data.filter((item) => item.value > 0),
    [data]
  );

  const chartOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      color: COLORS,
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      legend: {
        orient: "horizontal",
        bottom: 0,
        left: "center",
        textStyle: {
          color: TEXT_COLOR,
          fontSize: 14,
          fontFamily: "Inter, sans-serif",
        },
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 20,
      },
      series: [
        {
          name: "Status dos Budgets",
          type: "pie",
          radius: ["40%", "70%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: "rgba(15,15,15,0.2)",
            borderWidth: 2,
          },
          label: {
            show: true,
            color: TEXT_COLOR,
            formatter: "{b}\n{c} ({d}%)",
            fontSize: 14,
            lineHeight: 20,
            fontFamily: "Inter, sans-serif",
          },
          labelLine: { length: 16, length2: 10 },
          data: filteredData,
        },
      ],
    }),
    [filteredData]
  );

  return (
    <Card className="border-border shadow-sm bg-card/80">
      <CardHeader className="space-y-1.5 pb-0">
        <CardTitle className="text-lg">Status dos Budgets</CardTitle>
        <p className="text-xs text-muted-foreground">
          Distribuição entre abertos, aceitos, cancelados e concluídos.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div style={{ height: "450px", width: "100%" }}>
          {loading ? (
            <ChartPlaceholder loading title="Carregando dados..." />
          ) : filteredData.length === 0 ? (
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
      </CardContent>
    </Card>
  );
}
