import { create } from "zustand";
import { tauriInvoke } from "@/lib/tauri";
import type { FileEntry } from "@/types/fs";

function extractError(err: unknown): string {
	if (typeof err === "string") return err;
	if (err instanceof Error) return err.message;
	try {
		return JSON.stringify(err);
	} catch {
		return "Unknown error";
	}
}

export interface ClipboardEntry {
	path: string;
	name: string;
	op: "copy" | "cut";
}

interface FileSystemState {
	currentPath: string;
	entries: FileEntry[];
	isLoading: boolean;
	error: string | null;
	history: string[];
	historyIndex: number;
	homePath: string;

	// Selection
	selectedPaths: Set<string>;
	selectEntry: (path: string, multi: boolean) => void;
	clearSelection: () => void;

	// Clipboard
	clipboard: ClipboardEntry | null;
	setClipboard: (entry: ClipboardEntry | null) => void;

	// Navigation
	setCurrentPath: (path: string) => Promise<void>;
	refresh: () => Promise<void>;
	goBack: () => Promise<void>;
	goForward: () => Promise<void>;

	// File ops
	deleteEntries: (paths: string[]) => Promise<void>;
	pasteClipboard: () => Promise<void>;
	createDirectory: (name: string) => Promise<void>;
	setHomePath: (path: string) => void;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
	currentPath: "",
	entries: [],
	isLoading: false,
	error: null,
	history: [],
	historyIndex: -1,
	homePath: "",
	selectedPaths: new Set(),
	clipboard: null,

	setHomePath: (path) => set({ homePath: path }),

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
			// Always select, don't toggle off if already selected
			set({ selectedPaths: new Set([path]) });
		}
	},

	clearSelection: () => set({ selectedPaths: new Set() }),

	setClipboard: (clipboard) => set({ clipboard }),

	setCurrentPath: async (path: string) => {
		set({ isLoading: true, error: null, selectedPaths: new Set() });
		try {
			const entries = await tauriInvoke<FileEntry[]>("read_directory", { path });
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
		const { currentPath } = get();
		if (!currentPath) return;
		set({ isLoading: true, error: null });
		try {
			const entries = await tauriInvoke<FileEntry[]>("read_directory", {
				path: currentPath,
			});
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	goBack: async () => {
		const { history, historyIndex } = get();
		if (historyIndex > 0) {
			const newIndex = historyIndex - 1;
			const path = history[newIndex];
			set({ isLoading: true, error: null, selectedPaths: new Set() });
			try {
				const entries = await tauriInvoke<FileEntry[]>("read_directory", { path });
				set({ currentPath: path, entries, isLoading: false, historyIndex: newIndex });
			} catch (err) {
				set({ error: extractError(err), isLoading: false });
			}
		}
	},

	goForward: async () => {
		const { history, historyIndex } = get();
		if (historyIndex < history.length - 1) {
			const newIndex = historyIndex + 1;
			const path = history[newIndex];
			set({ isLoading: true, error: null, selectedPaths: new Set() });
			try {
				const entries = await tauriInvoke<FileEntry[]>("read_directory", { path });
				set({ currentPath: path, entries, isLoading: false, historyIndex: newIndex });
			} catch (err) {
				set({ error: extractError(err), isLoading: false });
			}
		}
	},

	deleteEntries: async (paths: string[]) => {
		set({ isLoading: true, error: null });
		try {
			for (const p of paths) {
				await tauriInvoke("delete_entry", { path: p });
			}
			// Refresh after delete
			const { currentPath } = get();
			const entries = await tauriInvoke<FileEntry[]>("read_directory", {
				path: currentPath,
			});
			set({ entries, isLoading: false, selectedPaths: new Set() });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	pasteClipboard: async () => {
		const { clipboard, currentPath } = get();
		if (!clipboard) return;

		const destName = clipboard.name;
		// Build unique destination path
		let destPath = `${currentPath.replace(/\/$/, "")}/${destName}`;

		// If same path, add _copy suffix
		if (destPath === clipboard.path) {
			const ext = destName.includes(".")
				? "." + destName.split(".").pop()
				: "";
			const base = ext ? destName.slice(0, -ext.length) : destName;
			destPath = `${currentPath.replace(/\/$/, "")}/${base}_copy${ext}`;
		}

		set({ isLoading: true, error: null });
		try {
			await tauriInvoke("copy_entry", { src: clipboard.path, dest: destPath });

			if (clipboard.op === "cut") {
				await tauriInvoke("delete_entry", { path: clipboard.path });
				set({ clipboard: null });
			}

			const entries = await tauriInvoke<FileEntry[]>("read_directory", {
				path: currentPath,
			});
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	createDirectory: async (name: string) => {
		const { currentPath } = get();
		const trimmed = name.trim();
		if (!trimmed) return;
		const newPath = `${currentPath.replace(/\/$/, "")}/${trimmed}`;
		set({ isLoading: true, error: null });
		try {
			await tauriInvoke("create_directory", { path: newPath });
			const entries = await tauriInvoke<FileEntry[]>("read_directory", {
				path: currentPath,
			});
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},
}));
