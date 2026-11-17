import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Images, Trash2, Upload } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { del, errorMessage } from '../../services/api';
import { uploadImages } from '../../components/ui/ImageInput';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Form';
import { Alert, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { PageHeader, Pagination, SmartImage } from '../../components/ui/Misc';
import { formatDate, titleCase } from '../../utils/format';

export default function MediaPage() {
  const [folder, setFolder] = useState('');
  const [page, setPage] = useState(1);
  const [uploadFolder, setUploadFolder] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const { data: status } = useFetch('/admin/media/status');
  const { data, loading, error, reload } = useFetch('/admin/media', { page, folder: folder || undefined, limit: 40 });
  const folders = (status?.folders || []).map((f) => ({ value: f, label: titleCase(f) }));

  const onFiles = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const res = await uploadImages(e.target.files, uploadFolder);
      toast.success(`${res.length} image(s) uploaded`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await del(`/admin/media/${deleting._id}`);
      toast.success('Image deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Media & Images"
        description="Images are stored on Cloudinary. JPG, PNG, WEBP, GIF, AVIF or ICO up to 5 MB."
        actions={
          <>
            <Select className="w-40" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} options={folders} />
            <input ref={fileRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon" onChange={onFiles} />
            <Button icon={Upload} loading={uploading} disabled={status && !status.configured} onClick={() => fileRef.current?.click()}>
              Upload images
            </Button>
          </>
        }
      />
      {status && !status.configured && (
        <Alert tone="warn" className="mb-4">
          Cloudinary is not configured. Set <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code> and <code>CLOUDINARY_API_SECRET</code> in <code>server/.env</code> and restart the API to enable uploads.
        </Alert>
      )}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-3">
          <Select className="sm:w-56" placeholder="All folders" value={folder} onChange={(e) => (setFolder(e.target.value), setPage(1))} options={folders} />
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">{[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
        ) : !data.items.length ? (
          <EmptyState icon={Images} title="No images yet" description="Uploaded images can be reused for cars, cities, banners and branding." />
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {data.items.map((m) => (
              <div key={m._id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
                <SmartImage src={m.url} alt={m.alt || m.originalName} className="aspect-square w-full" />
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-slate-700" title={m.originalName}>{m.originalName}</p>
                  <p className="text-[11px] text-slate-400">
                    {titleCase(m.folder)} · {m.width}×{m.height} · {formatDate(m.createdAt)}
                  </p>
                  <div className="mt-1.5 flex gap-1">
                    <Button size="xs" variant="outline" icon={Copy} onClick={() => copy(m.url)}>URL</Button>
                    <Button size="xs" variant="ghost" className="text-rose-600" onClick={() => setDeleting(m)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy} title="Delete image?" message="The image is removed from Cloudinary. Pages still using this URL will show a placeholder." />
    </div>
  );
}
