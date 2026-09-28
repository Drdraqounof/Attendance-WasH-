export function StatCell({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  return (
    <div className="bg-white/80 px-4 py-3">
      <p className="text-sm font-semibold tracking-[0.12em] text-slate/55 uppercase">{label}</p>
      <p className={`font-display mt-1 text-2xl font-bold tabular-nums ${tone}`}>
        {value}
        <span className="text-base font-medium text-slate/40"> / {total}</span>
      </p>
      <p className="text-sm text-slate/60">active</p>
    </div>
  );
}
