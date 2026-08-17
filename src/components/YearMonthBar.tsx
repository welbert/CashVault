import { MONTH_NAMES } from "../strings";

type Props = {
  year: number;
  month: number;
  yearsWithData: number[];
  monthsWithData: number[];
  onChange: (year: number, month: number) => void;
};

export function YearMonthBar({ year, month, yearsWithData, monthsWithData, onChange }: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([...yearsWithData, currentYear, year])).sort((a, b) => a - b);

  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => onChange(y, month)}
            className={`shrink-0 rounded-full px-4 py-2 font-mono text-xs transition-transform ${
              y === year
                ? "bg-gradient-to-br from-violet-700 to-violet-400 font-bold text-theme-bg"
                : "border border-theme-border bg-theme-surface text-theme-3 hover:scale-105"
            }`}
          >
            {y}
            {yearsWithData.includes(y) && y !== year && (
              <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-violet-300 align-middle" />
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {MONTH_NAMES.map((name, i) => {
          const m = i + 1;
          return (
            <button
              key={m}
              onClick={() => onChange(year, m)}
              className={`shrink-0 rounded-full px-4 py-2 font-mono text-xs transition-transform ${
                m === month
                  ? "bg-gradient-to-br from-violet-700 to-violet-400 font-bold text-theme-bg"
                  : "border border-theme-border bg-theme-surface text-theme-3 hover:scale-105"
              }`}
            >
              {name}
              {monthsWithData.includes(m) && m !== month && (
                <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-violet-300 align-middle" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
