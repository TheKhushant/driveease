import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { errorMessage, put } from '../../services/api';
import { useSite } from '../../context/SiteContext';
import { Button } from '../ui/Button';
import { defaultsFor, FormFields, payloadFor } from './FormFields';

/**
 * Edits one section of the WebsiteSettings document.
 *  section: 'hero' → doc = settings.hero, payload { hero: values }
 *  listKey: for array sections (services, faqs…) the rows field is named `items`.
 */
export function SectionForm({ settings, section, fields, listKey, title, description, onSaved }) {
  const site = useSite();
  const isList = Boolean(listKey);
  const doc = isList ? { items: settings?.[section] || [] } : settings?.[section] || {};
  const form = useForm({ defaultValues: defaultsFor(fields, doc) });

  useEffect(() => {
    form.reset(defaultsFor(fields, isList ? { items: settings?.[section] || [] } : settings?.[section] || {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, section]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = payloadFor(fields, values);
    try {
      const updated = await put('/admin/settings', { [section]: isList ? payload.items : payload });
      toast.success('Saved — changes are live on the website');
      onSaved?.(updated);
      site?.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="card p-5" noValidate>
      {(title || description) && (
        <div className="mb-5">
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      )}
      <FormFields fields={fields} form={form} />
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
        <Button type="submit" icon={Save} loading={form.formState.isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}
