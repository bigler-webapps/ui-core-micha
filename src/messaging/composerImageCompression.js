const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2560;

function imageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unable to decode image')); };
    image.src = url;
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

/** Compresses large images opportunistically; callers always receive a sendable file. */
export async function compressImageForUpload(file) {
  if (!file?.type?.startsWith('image/') || file.size <= MAX_IMAGE_BYTES) return file;
  try {
    const image = await imageDimensions(file);
    const largestEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
    if (!largestEdge || largestEdge <= MAX_IMAGE_EDGE) return file;
    const scale = MAX_IMAGE_EDGE / largestEdge;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((image.naturalWidth || image.width) * scale);
    canvas.height = Math.round((image.naturalHeight || image.height) * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await canvasBlob(canvas);
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified }) : file;
  } catch {
    return file;
  }
}
