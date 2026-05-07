import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RichFileEntry, SortOptions } from "@/types/fs";
import {
	createNavigationSlice,
	type NavigationSlice,
} from "./slices/navigation-slice";
import {
	createOperationSlice,
	type OperationSlice,
} from "./slices/operation-slice";
import {
	createSelectionSlice,
	type SelectionSlice,
} from "./slices/selection-slice";
import { createTaskSlice, type TaskSlice } from "./slices/task-slice";
import { DEFAULT_SORT, extractError, loadDir } from "./store-helpers";

export type { RichFileEntry as FileEntry };

export interface FileSystemState
	extends SelectionSlice,
		NavigationSlice,
		OperationSlice,
		TaskSlice {
	entries: RichFileEntry[];
	isLoading: boolean;
	error: string | null;
	sortOptions: SortOptions;
	setSortOptions: (opts: Partial<SortOptions>) => Promise<void>;
}

export const useFileSystemStore = create<FileSystemState>()(
	persist(
		(set, get, ...args) => ({
			entries: [],
			isLoading: false,
			error: null,
			sortOptions: { ...DEFAULT_SORT },

			...createSelectionSlice(set, get, ...args),
			...createNavigationSlice(set, get, ...args),
			...createOperationSlice(set, get, ...args),
			...createTaskSlice(set, get, ...args),

			setSortOptions: async (opts) => {
				const next = { ...get().sortOptions, ...opts };
				set({ sortOptions: next, isLoading: true });
				try {
					const entries = await loadDir(get().currentPath, next);
					set({ entries, isLoading: false, sortOptions: next });
				} catch (err) {
					set({ error: extractError(err), isLoading: false });
				}
			},
		}),
		{
			name: "lingfm-fs-state",
			partialize: (state) => ({
				sortOptions: state.sortOptions,
			}),
		},
	),
);
