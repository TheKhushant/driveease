import { forwardRef } from 'react';

export function Field({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ error, className = '', icon: Icon, ...props }, ref) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input ref={ref} className={`input pl-9 ${error ? 'input-error' : ''} ${className}`} {...props} />
      </div>
    );
  }
  return <input ref={ref} className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ error, className = '', rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={`input resize-y ${error ? 'input-error' : ''} ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ error, className = '', options = [], placeholder, ...props }, ref) {
  return (
    <select ref={ref} className={`input pr-8 ${error ? 'input-error' : ''} ${className}`} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={String(o.value)} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-primary' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-semibold text-slate-800">{label}</span>}
          {description && <span className="block text-xs text-slate-500">{description}</span>}
        </span>
      )}
    </label>
  );
}

/** Segmented control */
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl bg-slate-100 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-40 ${
            value === o.value ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {o.icon && <o.icon className="h-4 w-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
