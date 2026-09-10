export type Theme = "system" | "dark" | "violet-dark" | "midnight-blue" | "light";

export function getTheme(): Theme {
  return (localStorage.getItem("theme") as Theme) || "dark";
}

export function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function setTheme(theme: Theme) {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
}

/**
 * Lê uma CSS custom property já resolvida (ex: `--color-violet-400`, que
 * varia por tema em `index.css`) — usado pelos gráficos em Canvas
 * (Chart.js), que não conseguem receber `var(...)` como cor diretamente.
 */
export function themeColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}
