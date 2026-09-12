import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { TagAmount } from "../../lib/api";
import { fmt } from "../../lib/format";

ChartJS.register(ArcElement, Tooltip);

const PALETTE = ["#c9a3ff", "#ff7a9e", "#7ee3c0", "#ffcf7a", "#7ab8ff"];
const NEUTRAL = "rgba(255,255,255,0.18)";

function colorFor(label: string, index: number) {
  if (label === "Outros" || label === "Sem tag") return NEUTRAL;
  return PALETTE[index % PALETTE.length];
}

// Espaço no centro do donut é curto (~70px úteis) — valores grandes viram
// "R$ 12,3k" em vez de quebrar "R$ 12.345,67" ao meio.
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")}mi`;
  if (n >= 10_000) return `R$ ${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return fmt(n);
}

export function TagPieChart({ data }: { data: TagAmount[] }) {
  if (data.length === 0) {
    return <div className="flex h-[190px] items-center justify-center text-center text-sm text-theme-4">Nenhum lançamento no período.</div>;
  }

  const total = data.reduce((sum, d) => sum + d.total, 0);
  const colors = data.map((d, i) => colorFor(d.label, i));

  return (
    <div>
      <div className="relative mx-auto h-[150px] w-[150px]">
        <Doughnut
          data={{
            labels: data.map((d) => d.label),
            datasets: [{ data: data.map((d) => d.total), backgroundColor: colors, borderWidth: 0 }],
          }}
          options={{
            cutout: "62%",
            animation: { duration: 250 },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const value = ctx.parsed as number;
                    const pct = total > 0 ? (value / total) * 100 : 0;
                    return ` ${ctx.label}: ${fmt(value)} (${pct.toFixed(0)}%)`;
                  },
                },
              },
            },
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <div className="font-mono text-xs font-bold leading-tight text-theme-1">{fmtCompact(total)}</div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-theme-3">total</div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-theme-3">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[i] }} />
              {d.label}
            </span>
            <span className="font-mono font-semibold text-theme-1">{fmt(d.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
