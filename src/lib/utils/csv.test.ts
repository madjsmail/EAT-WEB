import { describe, expect, it } from 'vitest';
import { parseCsvHeader } from './csv.js';

describe('parseCsvHeader', () => {
	it('strips the UTF-8 BOM left by Excel', () => {
		expect(parseCsvHeader('\uFEFFfirst_name,last_name,email\nAda,Lovelace,ada@acme.test')).toEqual([
			'first_name',
			'last_name',
			'email'
		]);
	});

	it('keeps quoted commas inside one header', () => {
		expect(parseCsvHeader('"Last name, alias",email\n"Lovelace, Ada",ada@acme.test')).toEqual([
			'Last name, alias',
			'email'
		]);
	});

	it('handles CRLF and escaped quotes', () => {
		expect(parseCsvHeader('"nick""name",email\r\nx,y')).toEqual(['nick"name', 'email']);
	});
});
