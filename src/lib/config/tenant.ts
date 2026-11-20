/**
 * One user belongs to exactly one organization, so auth payloads only need the
 * tenant slug. Until the API resolves it from the email, the seeded
 * development organization is the default and `?org=` overrides it.
 */
export const DEFAULT_ORG_SLUG = 'acme';

export function currentOrgSlug(url: { searchParams: { get(key: string): string | null } }): string {
	return url.searchParams.get('org') ?? DEFAULT_ORG_SLUG;
}
