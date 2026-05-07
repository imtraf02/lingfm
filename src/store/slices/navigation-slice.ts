import type { StateCreator } from "zustand";
import { tauriInvoke } from "@/lib/tauri";
import type { FileSystemState } from "../use-file-system-store";
import { extractError, loadDir } from "../store-helpers";

export interface NavigationSlice {
	currentPath: string;
	history: string[];
	historyIndex: number;
	homePath: string;
	setHomePath: (path: string) => void;
	setCurrentPath: (path: string) => Promise<void>;
	refresh: () => Promise<void>;
	goBack: () => Promise<void>;
	goForward: () => Promise<void>;
}

export const createNavigationSlice: StateCreator<
	FileSystemState,
	[],
	[],
	NavigationSlice
> = (set, get) => ({
	currentPath: "",
	history: [],
	historyIndex: -1,
	homePath: "",

	setHomePath: (path) => set({ homePath: path }),

	setCurrentPath: async (path: string) => {
		set({ isLoading: true, error: null, selectedPaths: new Set() });
		try {
			await tauriInvoke("watch_dir", { path }).catch(() => {});
			const entries = await loadDir(path, get().sortOptions);
			const { history, historyIndex } = get();
			const newHistory = history.slice(0, historyIndex + 1);
			newHistory.push(path);
			set({
				currentPath: path,
				entries,
				isLoading: false,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			});
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	refresh: async () => {
		const { currentPath, sortOptions } = get();
		if (!currentPath) return;
		set({ isLoading: true, error: null });
		try {
			const entries = await loadDir(currentPath, sortOptions);
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	goBack: async () => {
		const { history, historyIndex, sortOptions } = get();
		if (historyIndex > 0) {
			const newIndex = historyIndex - 1;
			const path = history[newIndex];
			set({ isLoading: true, error: null, selectedPaths: new Set() });
			try {
				await tauriInvoke("watch_dir", { path }).catch(() => {});
				const entries = await loadDir(path, sortOptions);
				set({
					currentPath: path,
					entries,
					isLoading: false,
					historyIndex: newIndex,
				});
			} catch (err) {
				set({ error: extractError(err), isLoading: false });
			}
		}
	},

	goForward: async () => {
		const { history, historyIndex, sortOptions } = get();
		if (historyIndex < history.length - 1) {
			const newIndex = historyIndex + 1;
			const path = history[newIndex];
			set({ isLoading: true, error: null, selectedPaths: new Set() });
			try {
				await tauriInvoke("watch_dir", { path }).catch(() => {});
				const entries = await loadDir(path, sortOptions);
				set({
					currentPath: path,
					entries,
					isLoading: false,
					historyIndex: newIndex,
				});
			} catch (err) {
				set({ error: extractError(err), isLoading: false });
			}
		}
	},
});
