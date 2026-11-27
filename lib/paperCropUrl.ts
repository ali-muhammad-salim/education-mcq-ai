// Public question images can stay in browser caches after the underlying crop is corrected.
export function paperCropUrl(src: string): string {
  return /^\/paper-crops\/MTH-(?:IX|X)-(?:201[789]|202[1-5])-P[12]\/[^?#]+$/.test(src)
    ? src + '?v=20261128'
    : src;
}
