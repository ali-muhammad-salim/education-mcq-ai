// Server-only runtime override avoids baking a development origin into Docker.
export function configuredSiteUrl() {
  return process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || undefined;
}
