import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/avif'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** In-memory upload; files are streamed to Cloudinary. SVG is rejected (script risk). */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}. Use JPG, PNG, WEBP, GIF, AVIF or ICO.`));
    }
    return cb(null, true);
  },
});

/** Verify magic bytes so a renamed file can't pass as an image. */
export function looksLikeImage(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const hex = buffer.subarray(0, 12).toString('hex');
  return (
    hex.startsWith('ffd8ff') || // jpeg
    hex.startsWith('89504e47') || // png
    hex.startsWith('47494638') || // gif
    (hex.startsWith('52494646') && buffer.subarray(8, 12).toString() === 'WEBP') || // webp
    hex.startsWith('00000100') || // ico
    buffer.subarray(4, 12).toString().startsWith('ftypavi') // avif
  );
}
