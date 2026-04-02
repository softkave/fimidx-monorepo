export function errorSiteA(): void {
  const err = new Error("pkgA/shared/errorSite boom");
  throw err;
}

