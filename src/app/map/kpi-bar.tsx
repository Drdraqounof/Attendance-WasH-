export function KpiBar({
  label,
  value,
  unit,
  max,
  color,
  prefix = "",
}: {
  label: string;
  value: number;
  unit: string;
  max: number;
  color: string;
  prefix?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate/70">{label}</span>
        <span className="font-display text-sm font-semibold tabular-nums" style={{ color }}>
          {prefix}
          {value.toFixed(1)} {unit}
        </span>
      </div>
      <div
        className="h-1.5 w-full bg-surface-2"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
