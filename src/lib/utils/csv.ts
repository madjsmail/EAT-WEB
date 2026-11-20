/**
 * Read the first record of a CSV file. Handles a UTF-8 BOM and quoted cells
 * containing commas, so a file exported straight from Excel previews correctly.
 */
export function parseCsvHeader(text: string): string[] {
	const source = text.replace(/^\uFEFF/, '');
	const cells: string[] = [];
	let cell = '';
	let quoted = false;

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		if (quoted) {
			if (char === '"' && source[index + 1] === '"') {
				cell += '"';
				index += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				cell += char;
			}
			continue;
		}
		if (char === '"') {
			quoted = true;
		} else if (char === ',') {
			cells.push(cell);
			cell = '';
		} else if (char === '\n' || char === '\r') {
			break;
		} else {
			cell += char;
		}
	}
	if (cell !== '' || cells.length > 0) cells.push(cell);
	return cells.map((value) => value.trim());
}
