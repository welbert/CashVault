import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { themeColor } from "../../theme";

ChartJS.register(ArcElement, Tooltip);

export function GoalDonut({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const accent = themeColor("--color-violet-300", "#c4b5fd");
  return (
    <div className="relative mx-auto h-[190px] w-[190px]">
      <Doughnut
        data={{
          datasets: [
            {
              data: [clamped, 100 - clamped],
              backgroundColor: [accent, "rgba(255,255,255,0.06)"],
              borderWidth: 0,
            },
          ],
        }}
        options={{
          cutout: "78%",
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          animation: { animateRotate: true, duration: 250 },
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-theme-1">{Math.round(clamped)}%</div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-theme-3">da meta</div>
      </div>
    </div>
  );
}
