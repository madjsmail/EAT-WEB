import { logout, me, type LoginResult, type UserProfile } from '#lib/api/auth.js';

class SessionStore {
	user = $state<UserProfile | null>(null);
	permissions = $state<string[]>([]);
	/** True once the session has been checked (or applied after login). */
	ready = $state(false);

	get isAuthenticated(): boolean {
		return this.user !== null;
	}

	get displayName(): string {
		if (!this.user) return '';
		return `${this.user.first_name} ${this.user.last_name}`.trim();
	}

	get initials(): string {
		if (!this.user) return '';
		return `${this.user.first_name[0] ?? ''}${this.user.last_name[0] ?? ''}`.toUpperCase();
	}

	has(permission: string): boolean {
		return this.permissions.includes(permission);
	}

	apply(data: { user: UserProfile; permissions: string[] }): void {
		this.user = data.user;
		this.permissions = data.permissions;
	}

	applyLogin(result: LoginResult): void {
		this.apply(result);
		this.ready = true;
	}

	/** Load `/auth/me` once; returns whether the visitor is authenticated. */
	async ensure(): Promise<boolean> {
		if (this.ready) return this.user !== null;

		try {
			this.apply(await me());
		} catch {
			this.clear();
		}

		this.ready = true;
		return this.user !== null;
	}

	async signOut(): Promise<void> {
		try {
			await logout();
		} catch {
			// Local sign-out must still proceed when the API is unreachable.
		}
		this.clear();
		this.ready = true;
	}

	clear(): void {
		this.user = null;
		this.permissions = [];
	}
}

export const session = new SessionStore();
