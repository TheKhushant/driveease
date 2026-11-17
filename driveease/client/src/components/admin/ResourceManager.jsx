import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { del, errorMessage, fieldErrors, post, put } from '../../services/api';
import { useDebounce, useFetch } from '../../hooks/useFetch';
import { Button } from '../ui/Button';
import { Select } from '../ui/Form';
import { EmptyState, ErrorState, Skeleton } from '../ui/Feedback';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { PageHeader, Pagination } from '../ui/Misc';
import { defaultsFor, FormFields, payloadFor } from './FormFields';

/**
 * Generic admin CRUD screen driven by configuration.
 *
 * props:
 *  endpoint   '/admin/cities'
 *  columns    [{ key, label, render?(row), className? }]
 *  fields     form field config (see FormFields)
 *  filters    [{ name, label, options }]
 *  transformPayload(payload, row) → payload
 */
export function ResourceManager({
  title,
  description,
  endpoint,
  columns,
  fields,
  filters = [],
  singular = 'item',
  searchable = true,
  defaultSort,
  modalSize = 'lg',
  transformPayload,
  extraActions,
  headerActions,
  emptyIcon,
  canCreate = true,
  pageSize = 20,
  embedded = false,
  extraParams,
  onChanged,
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const debounced = useDebounce(search);
  const params = { page, limit: pageSize, search: debounced || undefined, sort: defaultSort, ...filterValues, ...(extraParams || {}) };
  const { data, loading, error, reload } = useFetch(endpoint, params);

  const [editing, setEditing] = useState(null); // null | 'new' | row
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({ defaultValues: defaultsFor(fields) });

  useEffect(() => setPage(1), [debounced, JSON.stringify(filterValues)]);

  const openForm = (row) => {
    form.reset(defaultsFor(fields, row === 'new' ? {} : row));
    setEditing(row);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      let payload = payloadFor(fields, values);
      if (transformPayload) payload = transformPayload(payload, editing);
      if (editing === 'new') await post(endpoint, payload);
      else await put(`${endpoint}/${editing._id}`, payload);
      toast.success(`${singular[0].toUpperCase()}${singular.slice(1)} ${editing === 'new' ? 'created' : 'updated'}`);
      setEditing(null);
      reload();
      onChanged?.();
    } catch (err) {
      Object.entries(fieldErrors(err)).forEach(([name, message]) => form.setError(name, { message }));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  });

  const onDelete = async () => {
    setBusy(true);
    try {
      await del(`${endpoint}/${deleting._id}`);
      toast.success(`${singular} deleted`);
      setDeleting(null);
      reload();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items || [];

  return (
    <div>
      {!embedded && (
        <PageHeader
          title={title}
          description={description}
          actions={
            <>
              {headerActions}
              {canCreate && (
                <Button icon={Plus} onClick={() => openForm('new')}>
                  Add {singular}
                </Button>
              )}
            </>
          }
        />
      )}

      <div className="card overflow-hidden">
        {(searchable || filters.length > 0 || embedded) && (
          <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
            {searchable && (
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder={`Search ${title?.toLowerCase() || ''}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
            {filters.map((f) => (
              <Select
                key={f.name}
                className="sm:w-44"
                placeholder={f.label}
                options={f.options}
                value={filterValues[f.name] || ''}
                onChange={(e) => setFilterValues((v) => ({ ...v, [f.name]: e.target.value || undefined }))}
              />
            ))}
            {embedded && canCreate && (
              <Button icon={Plus} size="sm" onClick={() => openForm('new')} className="sm:ml-auto">
                Add {singular}
              </Button>
            )}
          </div>
        )}

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={emptyIcon}
            title={debounced || Object.values(filterValues).some(Boolean) ? 'No matches' : `No ${title?.toLowerCase() || 'items'} yet`}
            description={debounced ? 'Try a different search.' : canCreate ? `Add your first ${singular} to get started.` : undefined}
            action={canCreate && !debounced ? <Button icon={Plus} onClick={() => openForm('new')}>Add {singular}</Button> : null}
          />
        ) : (
          <div className={`scrollbar-thin overflow-x-auto transition ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={`px-4 py-3 font-semibold ${c.className || ''}`}>
                      {c.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/60">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 py-3 align-middle ${c.className || ''}`}>
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {extraActions?.(row, reload)}
                        <Button size="icon" variant="ghost" onClick={() => openForm(row)} aria-label="Edit" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(row)} aria-label="Delete" title="Delete" className="text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? `Add ${singular}` : `Edit ${singular}`}
        size={modalSize}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={onSubmit}>
              {editing === 'new' ? 'Create' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate>
          <FormFields fields={fields} form={form} />
          <button type="submit" hidden />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={busy}
        title={`Delete ${singular}?`}
        message="This cannot be undone. Records that depend on it will block deletion — consider marking it inactive instead."
      />
    </div>
  );
}
