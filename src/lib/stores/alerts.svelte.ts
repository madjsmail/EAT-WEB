import { listConsumableAlerts } from '#lib/api/consumables.js';
import { listLicenseAlerts } from '#lib/api/licenses.js';
import { session } from '#lib/stores/session.svelte.js';

/**
 * Sidebar badge counters. Refreshed on navigation instead of polling, since
 * the backend has no push channel.
 */
class AlertsStore {
	/** Number of consumables at or below their alert threshold. */
	lowStock = $state(0);
	/** Number of licenses inside the 90-day expiry window (or expired). */
	licenseExpiring = $state(0);
	loading = $state(false);

	async refresh() {
		if (!session.ready || !session.user) return;
		this.loading = true;

		const tasks: Promise<void>[] = [];

		if (session.has('consumables.read')) {
			tasks.push(
				listConsumableAlerts()
					.then((rows) => {
						this.lowStock = rows.length;
					})
					.catch(() => {
						// Badges are advisory; a failure just hides the count.
					})
			);
		} else {
			this.lowStock = 0;
		}

		if (session.has('licenses.read')) {
			tasks.push(
				listLicenseAlerts()
					.then((alerts) => {
						this.licenseExpiring =
							alerts.expired.length +
							alerts.within_30_days.length +
							alerts.within_60_days.length +
							alerts.within_90_days.length;
					})
					.catch(() => {
						// Same as above.
					})
			);
		} else {
			this.licenseExpiring = 0;
		}

		await Promise.all(tasks);
		this.loading = false;
	}
}

export const alerts = new AlertsStore();
