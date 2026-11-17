import { Media } from '../models/index.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { looksLikeImage } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/query.js';
import { slugify } from '../utils/slugify.js';

const FOLDERS = ['general', 'branding', 'banners', 'vehicles', 'categories', 'cities', 'drivers', 'testimonials', 'content'];

const assertConfigured = () => {
  if (!isCloudinaryConfigured()) {
    throw ApiError.unavailable(
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server/.env and restart the server. You can still paste image URLs.',
    );
  }
};

function uploadBuffer(buffer, folder, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.cloudinary.folder}/${folder}`,
        resource_type: 'image',
        public_id: `${slugify(originalName.replace(/\.[^.]+$/, '')).slice(0, 40) || 'image'}-${Date.now().toString(36)}`,
        overwrite: false,
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });
}

export const mediaStatus = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { configured: isCloudinaryConfigured(), folders: FOLDERS } });
});

export const uploadMedia = asyncHandler(async (req, res) => {
  assertConfigured();
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) throw ApiError.badRequest('No file uploaded. Use the "files" field.');
  const folder = FOLDERS.includes(req.body.folder) ? req.body.folder : 'general';
  for (const f of files) {
    if (!looksLikeImage(f.buffer)) throw ApiError.badRequest(`${f.originalname} is not a valid image file`);
  }
  const created = [];
  for (const f of files) {
    let result;
    try {
      result = await uploadBuffer(f.buffer, folder, f.originalname);
    } catch (err) {
      throw new ApiError(502, `Upload to Cloudinary failed: ${err.message || 'unknown error'}`);
    }
    created.push(
      await Media.create({
        url: result.secure_url,
        publicId: result.public_id,
        folder,
        originalName: f.originalname,
        format: result.format,
        mimeType: f.mimetype,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        alt: req.body.alt,
        uploadedBy: req.admin._id,
      }),
    );
  }
  res.status(201).json({ success: true, message: `${created.length} file(s) uploaded`, data: created });
});

export const listMedia = asyncHandler(async (req, res) => {
  const pg = getPagination(req.query, { defaultLimit: 40 });
  const filter = {};
  if (req.query.folder && FOLDERS.includes(req.query.folder)) filter.folder = req.query.folder;
  const [items, total] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Media.countDocuments(filter),
  ]);
  res.json({ success: true, data: paginated(items, total, pg) });
});

export const updateMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw ApiError.notFound('Media not found');
  if (typeof req.body.alt === 'string') media.alt = req.body.alt.slice(0, 200);
  if (FOLDERS.includes(req.body.folder)) media.folder = req.body.folder;
  await media.save();
  res.json({ success: true, data: media });
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw ApiError.notFound('Media not found');
  if (isCloudinaryConfigured()) {
    try {
      await cloudinary.uploader.destroy(media.publicId, { resource_type: 'image', invalidate: true });
    } catch (err) {
      throw new ApiError(502, `Could not delete from Cloudinary: ${err.message}`);
    }
  }
  await media.deleteOne();
  res.json({ success: true, message: 'Image deleted. Remember to replace it anywhere it was used.' });
});
