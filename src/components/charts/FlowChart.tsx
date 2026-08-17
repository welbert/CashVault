import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { MonthSummary } from "../../lib/api";
import { fmt } from "../../lib/format";
import { MONTH_NAMES } from "../../strings";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export function FlowChart({ series }: { series: MonthSummary[] }) {
  const data = {
    labels: MONTH_NAMES.map((m) => m.toLowerCase()),
    datasets: [
      {
        label: "Entradas",
        data: series.map((m) => m.inTotal),
        borderColor: "#c9a3ff",
        backgroundColor: "rgba(184,145,245,0.2)",
        fill: true,
        tension: 0.42,
        borderWidth: 2.5,
        pointRadius: 0,
      },
      {
        label: "Saídas",
        data: series.map((m) => m.outTotal),
        borderColor: "#ff7a9e",
        backgroundColor: "rgba(255,122,158,0.14)",
        fill: true,
        tension: 0.42,
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="h-64">
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y as number)}` },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { callback: (v) => (v === 0 ? "R$ 0" : `R$ ${Number(v) / 1000}k`) },
            },
          },
        }}
      />
    </div>
  );
}
