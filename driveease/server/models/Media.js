import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, unique: true },
    folder: { type: String, default: 'general' },
    originalName: String,
    format: String,
    mimeType: String,
    bytes: Number,
    width: Number,
    height: Number,
    alt: { type: String, trim: true, maxlength: 200 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

mediaSchema.index({ folder: 1, createdAt: -1 });

export default mongoose.model('Media', mediaSchema);
