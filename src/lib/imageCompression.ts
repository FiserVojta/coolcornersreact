/**
 * Client-side downscaling of images before upload. Phone photos are 5–20MB; at the sizes
 * the app displays them anything beyond MAX_UPLOAD_DIMENSION px is wasted upload time, so
 * large images are re-encoded in the browser and the smaller file is sent instead.
 */

const MAX_UPLOAD_DIMENSION = 2560;
const JPEG_QUALITY = 0.85;
/** Below this size compression saves little transfer time; send the original. */
const COMPRESS_THRESHOLD_BYTES = 1_000_000;

/**
 * Formats the canvas pipeline can decode and meaningfully re-encode. GIF (animation),
 * SVG (vector) and formats browsers can't decode (e.g. HEIC) pass through untouched.
 */
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const compressImageForUpload = async (file: File): Promise<File> => {
  if (!COMPRESSIBLE_TYPES.has(file.type) || file.size <= COMPRESS_THRESHOLD_BYTES) {
    return file;
  }
  try {
    const bitmap = await decodeUpright(file);
    try {
      const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      // PNG stays PNG (it may carry transparency); JPEG and WebP re-encode as JPEG.
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await renderToBlob(bitmap, width, height, outputType);
      if (!blob || blob.size >= file.size) {
        return file;
      }
      return new File([blob], renameForType(file.name, outputType), { type: outputType });
    } finally {
      bitmap.close();
    }
  } catch {
    // Anything the browser can't decode or re-encode is uploaded as-is.
    return file;
  }
};

const decodeUpright = async (file: File): Promise<ImageBitmap> => {
  try {
    // EXIF-rotated photos must be decoded upright: re-encoding strips the orientation
    // tag, so the pixels themselves have to be rotated before drawing.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
};

const renderToBlob = (
  bitmap: ImageBitmap,
  width: number,
  height: number,
  type: string
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
};

const renameForType = (name: string, type: string): string => {
  if (type !== 'image/jpeg') return name;
  const base = name.replace(/\.[^.]+$/, '');
  return `${base || name}.jpg`;
};
