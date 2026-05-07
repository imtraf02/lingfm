import type { StateCreator } from "zustand";
import type { RichFileEntry } from "@/types/fs";
import type { FileSystemState } from "../use-file-system-store";

export interface SelectionSlice {
	selectedPaths: Set<string>;
	selectEntry: (path: string, multi: boolean) => void;
	selectAll: () => void;
	clearSelection: () => void;
	bulkRenamingEntries: RichFileEntry[];
	setBulkRenamingEntries: (entries: RichFileEntry[]) => void;
}

export const createSelectionSlice: StateCreator<
	FileSystemState,
	[],
	[],
	SelectionSlice
> = (set, get) => ({
	selectedPaths: new Set(),
	bulkRenamingEntries: [],

	selectEntry: (path, multi) => {
		const { selectedPaths } = get();
		if (multi) {
			const next = new Set(selectedPaths);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			set({ selectedPaths: next });
		} else {
			set({ selectedPaths: new Set([path]) });
		}
	},

	selectAll: () => {
		const { entries } = get();
		set({ selectedPaths: new Set(entries.map((e) => e.path)) });
	},

	clearSelection: () => set({ selectedPaths: new Set() }),

	setBulkRenamingEntries: (entries) => set({ bulkRenamingEntries: entries }),
});
