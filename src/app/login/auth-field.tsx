import { authInputClass } from "./auth-shell";

/** Labelled input used by the signed-out account forms. */
export function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  invalid,
  describedBy,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const describedByIds = [hintId, describedBy].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-slate">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={describedByIds}
        className={authInputClass}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-slate/60">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
