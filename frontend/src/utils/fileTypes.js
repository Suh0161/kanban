export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export const ALLOWED_IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';
export const ALLOWED_IMAGE_LABEL = 'PNG, JPEG, GIF, or WebP';

export function isAllowedImageFile(file) {
  return !!file && ALLOWED_IMAGE_MIME_TYPES.has(file.type);
}

export function filterAllowedImageFiles(files) {
  return Array.from(files || []).filter(isAllowedImageFile);
}
