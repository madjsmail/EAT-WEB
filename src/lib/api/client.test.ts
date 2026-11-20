import { describe, expect, it } from 'vitest';
import { buildQuery } from './client.js';
import { resolveI18n } from '#lib/i18n/index.js';

describe('buildQuery', () => {
	it('drops empty values and encodes the rest', () => {
		expect(buildQuery({ q: 'dell', page: 2, empty: '', missing: undefined, off: false })).toBe(
			'?q=dell&page=2&off=false'
		);
	});

	it('returns an empty string when nothing is set', () => {
		expect(buildQuery({})).toBe('');
	});
});

describe('resolveI18n', () => {
	it('prefers the requested locale, then fr, then en', () => {
		expect(resolveI18n({ en: 'Laptop', fr: 'Ordinateur' }, 'fr')).toBe('Ordinateur');
		expect(resolveI18n({ en: 'Laptop' }, 'ar')).toBe('Laptop');
		expect(resolveI18n({ de: 'Rechner' }, 'ar')).toBe('Rechner');
	});

	it('falls back to the provided default', () => {
		expect(resolveI18n(null, 'en', 'COMM.AST')).toBe('COMM.AST');
		expect(resolveI18n({}, 'ar', 'id-1')).toBe('id-1');
	});
});
