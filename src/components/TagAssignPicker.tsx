import { useState } from "react";
import { TagWithUsage } from "../lib/api";

type Props = {
  tags: TagWithUsage[];
  selected: number[];
  onToggle: (id: number) => void;
  onCreate: (name: string) => Promise<TagWithUsage>;
  limit?: number;
};

const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-transparent bg-gradient-to-br from-violet-700 to-violet-400 text-theme-bg"
      : "border-theme-border bg-theme-bg text-theme-3 hover:border-violet-400/50"
  }`;

/**
 * Variante do TagPicker usada só pra atribuir tags a uma movimentação: mostra
 * um número limitado de chips (as mais usadas), e um "+" que abre busca entre
 * as demais tags ou cria uma nova na hora. O TagPicker original continua
 * intocado pro filtro de Movimentações, que precisa listar todas.
 */
export function TagAssignPicker({ tags, selected, onToggle, onCreate, limit = 8 }: Props) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const sorted = [...tags].sort((a, b) => b.usageCount - a.usageCount);
  const top = sorted.slice(0, limit);
  const hiddenSelected = sorted.filter((t) => selected.includes(t.id) && !top.some((x) => x.id === t.id));
  const visible = [...top, ...hiddenSelected];

  const trimmedQuery = query.trim();
  const matches = trimmedQuery
    ? sorted.filter((t) => t.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : sorted.filter((t) => !visible.some((v) => v.id === t.id));
  const hasExactMatch = sorted.some((t) => t.name.toLowerCase() === trimmedQuery.toLowerCase());

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

  async function handleCreate() {
    if (!trimmedQuery || creating) return;
    setCreating(true);
    try {
      const tag = await onCreate(trimmedQuery);
      onToggle(tag.id);
      setQuery("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((tag) => (
          <button key={tag.id} type="button" onClick={() => onToggle(tag.id)} className={chipClass(selected.includes(tag.id))}>
            {tag.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-theme-border bg-theme-bg text-theme-3 hover:border-violet-400/50 hover:text-violet-300"
          title="Buscar ou criar tag"
        >
          +
        </button>
      </div>

      {searching && (
        <div className="flex flex-col gap-2 rounded-xl border border-theme-border bg-theme-bg p-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar tag..."
              className="flex-1 rounded-lg border border-theme-border bg-theme-surface px-3 py-1.5 text-sm text-theme-1 outline-none focus:border-violet-400"
            />
            <button type="button" onClick={closeSearch} className="text-xs text-theme-4 underline hover:text-violet-300">
              fechar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matches.map((tag) => (
              <button key={tag.id} type="button" onClick={() => onToggle(tag.id)} className={chipClass(selected.includes(tag.id))}>
                {tag.name}
              </button>
            ))}
            {matches.length === 0 && !trimmedQuery && <span className="text-xs text-theme-4">Nenhuma outra tag cadastrada.</span>}
          </div>
          {trimmedQuery && !hasExactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="self-start rounded-lg border border-violet-400/35 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/10 disabled:opacity-60"
            >
              + Criar tag "{trimmedQuery}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
