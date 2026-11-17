import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, ImagePlus, Images, Link2, Star, Trash2, Upload } from 'lucide-react';
import { api, errorMessage, get } from '../../services/api';
import { Button } from './Button';
import { Modal } from './Modal';
import { Spinner, EmptyState } from './Feedback';
import { SmartImage } from './Misc';

let statusPromise = null;
const mediaStatus = () => {
  statusPromise ||= get('/admin/media/status').catch(() => ({ configured: false }));
  return statusPromise;
};

export async function uploadImages(files, folder = 'general') {
  const fd = new FormData();
  [...files].forEach((f) => fd.append('files', f));
  fd.append('folder', folder);
  const res = await api.post('/admin/media/upload', fd);
  return res.data.data;
}

export function MediaPicker({ open, onClose, onSelect, multiple = false, folder }) {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState([]);
  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setItems(null);
    get('/admin/media', { limit: 100, ...(folder ? { folder } : {}) })
      .then((d) => setItems(d.items))
      .catch((e) => {
        toast.error(errorMessage(e));
        setItems([]);
      });
  }, [open, folder]);

  const toggle = (url) => {
    if (!multiple) {
      onSelect([url]);
      onClose();
      return;
    }
    setSelected((s) => (s.includes(url) ? s.filter((u) => u !== url) : [...s, url]));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Media library"
      size="lg"
      footer={
        multiple && (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!selected.length}
              onClick={() => {
                onSelect(selected);
                onClose();
              }}
            >
              Add {selected.length || ''} image(s)
            </Button>
          </>
        )
      }
    >
      {!items ? (
        <div className="grid place-items-center py-12">
          <Spinner />
        </div>
      ) : !items.length ? (
        <EmptyState icon={Images} title="No images uploaded yet" description="Upload images from Media & Images or with the Upload button." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => toggle(m.url)}
              className={`group relative overflow-hidden rounded-xl ring-2 transition ${selected.includes(m.url) ? 'ring-primary' : 'ring-transparent hover:ring-slate-300'}`}
            >
              <SmartImage src={m.url} alt={m.alt || m.originalName} className="aspect-square w-full" />
              {selected.includes(m.url) && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-white">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/**
 * Image field. `multiple` → value is string[]; otherwise string.
 * Upload goes to Cloudinary via the API; library and pasted URLs are also supported.
 */
export function ImageInput({ value, onChange, multiple = false, folder = 'general', max = 12, aspect = 'aspect-video' }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');
  const list = multiple ? value || [] : value ? [value] : [];

  useEffect(() => {
    mediaStatus().then((s) => setConfigured(Boolean(s.configured)));
  }, []);

  const set = (urls) => onChange(multiple ? urls.slice(0, max) : urls[urls.length - 1] || '');
  const add = (urls) => set(multiple ? [...list, ...urls.filter((u) => !list.includes(u))] : urls);

  const onFiles = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const media = await uploadImages(multiple ? files : [files[0]], folder);
      add(media.map((m) => m.url));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addUrl = () => {
    const v = url.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) {
      toast.error('Enter a valid http(s) image URL');
      return;
    }
    add([v]);
    setUrl('');
    setUrlMode(false);
  };

  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <div className={`grid gap-3 ${multiple ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:max-w-xs'}`}>
          {list.map((u, i) => (
            <div key={u} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <SmartImage src={u} className={`${aspect} w-full`} fallbackIcon={ImagePlus} />
              {multiple && i === 0 && <span className="absolute left-2 top-2 chip bg-ink/80 text-white">Cover</span>}
              <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                {multiple && i > 0 && (
                  <button type="button" title="Make cover" onClick={() => set([u, ...list.filter((x) => x !== u)])} className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-700 shadow hover:bg-white">
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" title="Remove" onClick={() => set(list.filter((x) => x !== u))} className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-rose-600 shadow hover:bg-white">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon" multiple={multiple} hidden onChange={onFiles} />
        <Button size="sm" variant="outline" icon={Upload} loading={uploading} disabled={!configured} onClick={() => fileRef.current?.click()} title={configured ? '' : 'Cloudinary is not configured on the server'}>
          {list.length && !multiple ? 'Replace' : 'Upload'}
        </Button>
        <Button size="sm" variant="outline" icon={Images} onClick={() => setPickerOpen(true)}>
          Library
        </Button>
        <Button size="sm" variant="ghost" icon={Link2} onClick={() => setUrlMode((v) => !v)}>
          URL
        </Button>
      </div>
      {!configured && <p className="text-xs text-amber-700">Uploads are disabled until Cloudinary is configured on the server. You can paste an image URL instead.</p>}
      {urlMode && (
        <div className="flex gap-2">
          <input className="input" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())} />
          <Button size="sm" onClick={addUrl}>
            Add
          </Button>
        </div>
      )}
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={add} multiple={multiple} />
    </div>
  );
}
