/**
 * The upload response's `url` is meant to be stored as-is in products/categories/brands, whose
 * contract pattern is an absolute `http(s)://` URL, so it is normally absolute already. If the
 * backend ever sends a path (`/media/x.png`) it is resolved against the API origin so the
 * preview and the stored value stay valid.
 */
export function absoluteMediaUrl(url: string, apiOrigin: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return `${apiOrigin}${url}`;
  return url;
}
