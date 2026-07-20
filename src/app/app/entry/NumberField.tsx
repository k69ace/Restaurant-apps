"use client";

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  hint?: string;
}

/** A large-tap-target, numeric-keyboard input for phone use during a shift.
 * Values are kept as strings in the parent so an empty field is
 * distinguishable from 0 (missing vs. genuinely zero matters throughout the
 * calculation module). */
export function NumberField({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  hint,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="min-h-11 rounded-lg border border-border bg-transparent px-4 py-2.5 text-base tabular-nums"
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
