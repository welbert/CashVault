type Props = {
  tags: { id: number; name: string }[];
  selected: number[];
  onToggle: (id: number) => void;
};

/**
 * Grade de chips de tag reaproveitada em todo lugar que precisa selecionar
 * tags — formulário de movimentação (atribuir) e filtro de Movimentações
 * (filtrar) — pra manter o visual e o comportamento idênticos.
 */
export function TagPicker({ tags, selected, onToggle }: Props) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-transparent bg-gradient-to-br from-violet-700 to-violet-400 text-theme-bg"
                : "border-theme-border bg-theme-bg text-theme-3 hover:border-violet-400/50"
            }`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
