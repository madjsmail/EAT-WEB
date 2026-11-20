interface PinnableColumn {
	getIsPinned(): false | "start" | "end";
	getIsLastColumn(side: "start"): boolean;
	getIsFirstColumn(side: "end"): boolean;
	getStart(side: "start"): number;
	getAfter(side: "end"): number;
}

/**
 * Pinning styles for sticky columns. Uses logical inset properties so pinned
 * columns stay on the correct edge in RTL layouts.
 */
export function getCommonPinningStyles(column: PinnableColumn, isSelected = false): string {
	const isPinned = column.getIsPinned();
	const isLastStartPinnedColumn = isPinned === "start" && column.getIsLastColumn("start");
	const isFirstEndPinnedColumn = isPinned === "end" && column.getIsFirstColumn("end");

	const styles: Array<string> = [];
	if (isLastStartPinnedColumn) {
		styles.push("box-shadow: -4px 0 4px -4px var(--border) inset");
	} else if (isFirstEndPinnedColumn) {
		styles.push("box-shadow: 4px 0 4px -4px var(--border) inset");
	}
	if (isPinned === "start") {
		styles.push(`inset-inline-start: ${column.getStart("start")}px`);
	}
	if (isPinned === "end") {
		styles.push(`inset-inline-end: ${column.getAfter("end")}px`);
	}
	styles.push(`position: ${isPinned ? "sticky" : "relative"}`);
	if (isSelected) {
		styles.push("background: var(--muted)");
	} else if (isPinned) {
		styles.push("background: var(--background)");
	}
	styles.push(`z-index: ${isPinned ? 1 : 0}`);
	return styles.join("; ");
}
