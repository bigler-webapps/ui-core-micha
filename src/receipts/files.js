import { RECEIPT_MAX_BYTES } from './wire';

const extOf = (file) => String(file?.name || '').split('.').pop().toLowerCase();
export function receiptFileProblem(file) {
  const ext = extOf(file);
  const supported = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'].includes(String(file?.type || '').toLowerCase()) || ['jpg', 'jpeg', 'png', 'heic', 'heif', 'pdf'].includes(ext);
  if (!supported) return 'unsupported_file_type';
  if (!Number.isFinite(file?.size) || file.size > RECEIPT_MAX_BYTES) return 'file_too_large';
  return null;
}
function decode(file) { return new Promise((resolve, reject) => { const url = URL.createObjectURL(file); const image = new Image(); image.onload = () => { URL.revokeObjectURL(url); resolve(image); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); }; image.src = url; }); }
function blobOf(canvas) { return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85)); }
export async function prepareReceiptFile(file) {
  const ext = extOf(file), type = String(file?.type || '').toLowerCase();
  if (file.size <= 1.5 * 1024 * 1024 || !(['image/jpeg', 'image/png'].includes(type) || ['jpg', 'jpeg', 'png'].includes(ext))) return file;
  try {
    const image = await decode(file), width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
    const scale = Math.min(1, 2400 / Math.max(width, height));
    if (!width || !height) return file;
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await blobOf(canvas);
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified }) : file;
  } catch { return file; }
}
