import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Field, Input, Select, Textarea, Toggle } from '../ui/Form';
import { ImageInput } from '../ui/ImageInput';
import { Button } from '../ui/Button';
import { useOptions } from '../../hooks/useFetch';
import { DAY_NAMES } from '../../utils/format';

const idOf = (v) => (v && typeof v === 'object' ? v._id ?? '' : v ?? '');

/** Convert an API document value into a form value for the given field. */
export function toFormValue(field, v) {
  switch (field.type) {
    case 'select':
      return idOf(v);
    case 'multiselect':
      return (v || []).map(idOf);
    case 'date':
      return v ? String(v).slice(0, 10) : '';
    case 'checkbox':
      return v ?? field.default ?? false;
    case 'images':
    case 'days':
      return v || [];
    case 'tags':
      return (v || []).join(', ');
    case 'rows':
      return (v || []).map((row) => Object.fromEntries(field.fields.map((f) => [f.name, toFormValue(f, row?.[f.name])])));
    case 'number':
      return v ?? field.default ?? '';
    default:
      return v ?? field.default ?? '';
  }
}

/** Convert a form value back to an API payload value. */
export function fromFormValue(field, v) {
  switch (field.type) {
    case 'number':
      return v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v);
    case 'select':
      return v === '' ? null : v;
    case 'date':
    case 'time':
      return v || null;
    case 'tags':
      return String(v || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    case 'days':
      return (v || []).map(Number);
    case 'rows':
      return (v || []).map((row) => Object.fromEntries(field.fields.map((f) => [f.name, fromFormValue(f, row?.[f.name])])));
    default:
      return v;
  }
}

export const defaultsFor = (fields, doc = {}) => Object.fromEntries(fields.map((f) => [f.name, toFormValue(f, doc?.[f.name])]));
export const payloadFor = (fields, values) => Object.fromEntries(fields.map((f) => [f.name, fromFormValue(f, values[f.name])]));

function OptionsSelect({ field, ...props }) {
  const { options } = useOptions(field.optionsUrl, { labelKey: field.optionLabel || 'name', params: field.optionsParams });
  return <Select options={field.options || options} placeholder={field.placeholder ?? (field.required ? 'Select…' : '— None —')} {...props} />;
}

function MultiCheck({ field, value = [], onChange }) {
  const { options: remote } = useOptions(field.optionsUrl, { labelKey: field.optionLabel || 'name' });
  const options = field.options || remote;
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => toggle(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
            value.includes(o.value) ? 'bg-primary text-white ring-primary' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
      {!options.length && <span className="text-xs text-slate-400">No options available</span>}
    </div>
  );
}

function DaysPicker({ value = [], onChange }) {
  const v = value.map(Number);
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAY_NAMES.map((d, i) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(v.includes(i) ? v.filter((x) => x !== i) : [...v, i].sort())}
          className={`h-9 w-11 rounded-lg text-xs font-semibold ring-1 transition ${v.includes(i) ? 'bg-primary text-white ring-primary' : 'bg-white text-slate-600 ring-slate-200'}`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function RowsField({ field, control, register, errors }) {
  const { fields: rows, append, remove } = useFieldArray({ control, name: field.name });
  const blank = Object.fromEntries(field.fields.map((f) => [f.name, toFormValue(f, f.default)]));
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-end">
          <div className={`grid flex-1 gap-2 ${field.rowCols || 'sm:grid-cols-3'}`}>
            {field.fields.map((sub) => (
              <FieldControl key={sub.name} field={{ ...sub, name: `${field.name}.${i}.${sub.name}` }} control={control} register={register} errors={errors} compact />
            ))}
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(i)} aria-label="Remove row" className="text-rose-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" icon={Plus} onClick={() => append(blank)}>
        {field.addLabel || 'Add row'}
      </Button>
    </div>
  );
}

const getError = (errors, name) => name.split('.').reduce((o, k) => o?.[k], errors)?.message;

export function FieldControl({ field, control, register, errors, compact }) {
  const error = getError(errors, field.name);
  const rules = {
    required: field.required ? `${field.label || 'This field'} is required` : false,
    ...(field.min !== undefined && field.type === 'number' ? { min: { value: field.min, message: `Minimum ${field.min}` } } : {}),
    ...(field.max !== undefined && field.type === 'number' ? { max: { value: field.max, message: `Maximum ${field.max}` } } : {}),
    ...(field.pattern ? { pattern: field.pattern } : {}),
  };

  let input;
  switch (field.type) {
    case 'textarea':
      input = <Textarea rows={field.rows || 3} placeholder={field.placeholder} error={error} {...register(field.name, rules)} />;
      break;
    case 'select':
      input = field.optionsUrl ? (
        <OptionsSelect field={field} error={error} {...register(field.name, rules)} />
      ) : (
        <Select options={field.options} placeholder={field.placeholder} error={error} {...register(field.name, rules)} />
      );
      break;
    case 'checkbox':
      input = (
        <Controller
          name={field.name}
          control={control}
          render={({ field: f }) => <Toggle checked={f.value} onChange={f.onChange} label={compact ? field.label : field.toggleLabel} description={field.description} />}
        />
      );
      break;
    case 'multiselect':
      input = <Controller name={field.name} control={control} render={({ field: f }) => <MultiCheck field={field} value={f.value} onChange={f.onChange} />} />;
      break;
    case 'days':
      input = <Controller name={field.name} control={control} render={({ field: f }) => <DaysPicker value={f.value} onChange={f.onChange} />} />;
      break;
    case 'image':
    case 'images':
      input = (
        <Controller
          name={field.name}
          control={control}
          rules={field.required ? { validate: (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)) || 'Image is required' } : undefined}
          render={({ field: f }) => <ImageInput value={f.value} onChange={f.onChange} multiple={field.type === 'images'} folder={field.folder} aspect={field.aspect} />}
        />
      );
      break;
    case 'rows':
      input = <RowsField field={field} control={control} register={register} errors={errors} />;
      break;
    case 'color':
      input = (
        <div className="flex items-center gap-2">
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => (
              <>
                <input type="color" value={f.value || '#000000'} onChange={f.onChange} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                <Input value={f.value || ''} onChange={f.onChange} placeholder="#0f766e" error={error} className="font-mono" />
              </>
            )}
          />
        </div>
      );
      break;
    default:
      input = (
        <Input
          type={field.type === 'tags' ? 'text' : field.type || 'text'}
          step={field.step ?? (field.type === 'number' ? 'any' : undefined)}
          placeholder={field.placeholder}
          error={error}
          {...register(field.name, rules)}
        />
      );
  }

  if (field.type === 'checkbox' && compact) return <div className="flex h-full items-end pb-2">{input}</div>;
  return (
    <Field label={field.type === 'checkbox' && !field.toggleLabel ? undefined : field.label} required={field.required} error={field.type === 'rows' ? undefined : error} hint={field.hint}>
      {field.type === 'checkbox' && !field.toggleLabel ? (
        <Controller name={field.name} control={control} render={({ field: f }) => <Toggle checked={f.value} onChange={f.onChange} label={field.label} description={field.description} />} />
      ) : (
        input
      )}
    </Field>
  );
}

/** Renders a grid of fields; supports showIf(values). */
export function FormFields({ fields, form }) {
  const { control, register, formState } = form;
  const values = useWatch({ control });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields
        .filter((f) => !f.showIf || f.showIf(values || {}))
        .map((f) => (
          <div key={f.name} className={f.span === 2 || ['textarea', 'rows', 'images', 'multiselect', 'days'].includes(f.type) ? 'sm:col-span-2' : ''}>
            {f.section && <h4 className="mb-3 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{f.section}</h4>}
            <FieldControl field={f} control={control} register={register} errors={formState.errors} />
          </div>
        ))}
    </div>
  );
}
