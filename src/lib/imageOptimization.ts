const TRANSFORM_PREFIX_REGEX =
  /^(?:a|ac|ar|b|bo|c|co|cs|d|dl|dn|dpr|du|e|eo|f|fl|fn|fps|g|h|if|ki|l|o|p|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z)_/;

/**
 * Inserts responsive Cloudinary transformations (`f_auto,q_auto,w_<width>/`)
 * after `/upload/` when no transformation segment is already present.
 * Returns all non-Cloudinary or pre-transformed URLs unchanged.
 */
export function optimizeImageUrl(url: string, width: number): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (!trimmed.includes('cloudinary.com')) return trimmed;

  const uploadMarker = '/upload/';
  const uploadIndex = trimmed.indexOf(uploadMarker);
  if (uploadIndex === -1) return trimmed;

  const prefix = trimmed.slice(0, uploadIndex + uploadMarker.length);
  const rest = trimmed.slice(uploadIndex + uploadMarker.length);
  if (!rest) return trimmed;

  const firstSegment = rest.split('/')[0] || '';
  const isVersionSegment = /^v\d+$/.test(firstSegment);
  const hasExistingTransform =
    !isVersionSegment &&
    (firstSegment.includes(',') || TRANSFORM_PREFIX_REGEX.test(firstSegment));

  if (hasExistingTransform) {
    return trimmed;
  }

  const safeWidth = Math.max(1, Math.round(width));
  return `${prefix}f_auto,q_auto,w_${safeWidth}/${rest}`;
}
