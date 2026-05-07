import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { StateCreator } from "zustand";
import { tauriInvoke } from "@/lib/tauri";
import type { FileSystemState } from "../use-file-system-store";
import { type ClipboardEntry, extractError, loadDir } from "../store-helpers";

export interface OperationSlice {
	clipboard: ClipboardEntry | null;
	setClipboard: (entry: ClipboardEntry | null) => void;
	lastTrashedPaths: string[][];
	deleteEntries: (paths: string[]) => Promise<void>;
	softDeleteEntries: (
		paths: string[],
		onProgress?: (done: number, total: number) => void,
	) => Promise<{ src: string; dest: string }[]>;
	undoSoftDelete: (
		items: { src: string; dest: string }[],
		onProgress?: (done: number, total: number) => void,
	) => Promise<void>;
	commitDelete: (items: { src: string; dest: string }[]) => Promise<void>;
	moveEntry: (src: string, dest: string) => Promise<void>;
	pasteClipboard: (
		onProgress?: (done: number, total: number) => void,
	) => Promise<void>;
	createDirectory: (name: string) => Promise<void>;
	trashEntries: (paths: string[]) => Promise<void>;
	restoreEntry: (path: string) => Promise<void>;
	undoTrash: () => Promise<void>;
	renameEntry: (from: string, newName: string) => Promise<void>;
	extractEntries: (paths: string[]) => Promise<void>;
	extractEntriesToFolder: (paths: string[]) => Promise<void>;
	extractEntriesToDialog: (paths: string[]) => Promise<void>;
}

export const createOperationSlice: StateCreator<
	FileSystemState,
	[],
	[],
	OperationSlice
> = (set, get) => ({
	clipboard: null,
	lastTrashedPaths: [],

	setClipboard: (clipboard) => set({ clipboard }),

	deleteEntries: async (paths: string[]) => {
		set({ isLoading: true, error: null });
		try {
			await Promise.all(
				paths.map((p) => tauriInvoke("delete_entry", { path: p })),
			);
			const { currentPath, sortOptions } = get();
			const entries = await loadDir(currentPath, sortOptions);
			set({ entries, isLoading: false, selectedPaths: new Set() });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	softDeleteEntries: async (
		paths: string[],
		onProgress?: (done: number, total: number) => void,
	) => {
		set({ isLoading: true, error: null });
		const softDeleted: { src: string; dest: string }[] = [];
		let done = 0;
		const total = paths.length;

		try {
			await Promise.all(
				paths.map(async (p) => {
					const parts = p.split(/[\\/]/);
					const filename = parts.pop();
					const dir = parts.join("/");
					const dest = `${dir}/.${filename}.lingfm_trash`;
					await tauriInvoke("move_entry", { src: p, dest });
					softDeleted.push({ src: p, dest });
					done++;
					if (onProgress) onProgress(done, total);
				}),
			);

			const { currentPath, sortOptions } = get();
			const entries = await loadDir(currentPath, sortOptions);
			set({ entries, isLoading: false, selectedPaths: new Set() });
			return softDeleted;
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
			return softDeleted;
		}
	},

	undoSoftDelete: async (
		items: { src: string; dest: string }[],
		onProgress?: (done: number, total: number) => void,
	) => {
		set({ isLoading: true, error: null });
		let done = 0;
		const total = items.length;

		try {
			await Promise.all(
				items.map(async (item) => {
					await tauriInvoke("move_entry", {
						src: item.dest,
						dest: item.src,
					});
					done++;
					if (onProgress) onProgress(done, total);
				}),
			);

			const { currentPath, sortOptions } = get();
			const entries = await loadDir(currentPath, sortOptions);
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	commitDelete: async (items: { src: string; dest: string }[]) => {
		try {
			await Promise.all(
				items.map((item) => tauriInvoke("delete_entry", { path: item.dest })),
			);
		} catch (err) {
			console.error("Failed to commit delete:", err);
		}
	},

	moveEntry: async (src: string, dest: string) => {
		set({ isLoading: true, error: null });
		try {
			await tauriInvoke("move_entry", { src, dest });
			const { currentPath, sortOptions } = get();
			const entries = await loadDir(currentPath, sortOptions);
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
			throw err;
		}
	},

	pasteClipboard: async (
		onProgress?: (done: number, total: number) => void,
	) => {
		const {
			clipboard,
			currentPath,
			sortOptions,
			entries: currentEntries,
		} = get();
		if (!clipboard) return;

		const existingNames = new Set(currentEntries.map((e) => e.name));
		const total = clipboard.paths.length;
		let done = 0;

		set({ isLoading: true, error: null });
		try {
			const operations = clipboard.paths.map((srcPath) => {
				const originalName = srcPath.split(/[\\/]/).pop() || clipboard.name;
				let destName = originalName;
				let destPath = `${currentPath.replace(/\/$/, "")}/${destName}`;

				if (clipboard.op === "cut" && destPath === srcPath) {
					return { srcPath, destPath, skip: true };
				}

				let counter = 1;
				const extMatch = originalName.lastIndexOf(".");
				const hasExt = extMatch > 0;
				const base = hasExt ? originalName.slice(0, extMatch) : originalName;
				const ext = hasExt ? originalName.slice(extMatch) : "";

				while (existingNames.has(destName)) {
					destName = `${base} (${counter})${ext}`;
					destPath = `${currentPath.replace(/\/$/, "")}/${destName}`;
					counter++;
				}

				existingNames.add(destName);
				return { srcPath, destPath, skip: false };
			});

			await Promise.all(
				operations.map(async (op) => {
					if (op.skip) {
						done++;
						if (onProgress) onProgress(done, total);
						return;
					}

					await tauriInvoke("copy_entry", {
						src: op.srcPath,
						dest: op.destPath,
					});
					if (clipboard.op === "cut") {
						await tauriInvoke("delete_entry", { path: op.srcPath });
					}
					done++;
					if (onProgress) onProgress(done, total);
				}),
			);

			if (clipboard.op === "cut") {
				set({ clipboard: null });
			}
			const entries = await loadDir(currentPath, sortOptions);
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	createDirectory: async (name: string) => {
		const { currentPath, sortOptions } = get();
		const trimmed = name.trim();
		if (!trimmed) return;
		const newPath = `${currentPath.replace(/\/$/, "")}/${trimmed}`;
		set({ isLoading: true, error: null });
		try {
			await tauriInvoke("create_directory", { path: newPath });
			const entries = await loadDir(currentPath, sortOptions);
			set({ entries, isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	trashEntries: async (paths: string[]) => {
		set({ isLoading: true, error: null });
		try {
			await Promise.all(
				paths.map((p) => tauriInvoke("async_trash", { path: p })),
			);
			set((state) => ({
				lastTrashedPaths: [paths, ...state.lastTrashedPaths.slice(0, 9)],
				isLoading: false,
				selectedPaths: new Set(),
				bulkRenamingEntries: [],
			}));
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
		}
	},

	restoreEntry: async (path: string) => {
		set({ isLoading: true, error: null });
		try {
			await tauriInvoke("restore_entry", { path });
			set({ isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
			throw err;
		}
	},

	undoTrash: async () => {
		const { lastTrashedPaths } = get();
		if (lastTrashedPaths.length === 0) return;

		const paths = lastTrashedPaths[0];
		set({ isLoading: true, error: null });
		try {
			for (const p of paths) {
				await tauriInvoke("undo_trash", { originalPath: p });
			}
			set((state) => ({
				lastTrashedPaths: state.lastTrashedPaths.slice(1),
				isLoading: false,
			}));
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
			throw err;
		}
	},

	renameEntry: async (from: string, newName: string) => {
		set({ isLoading: true, error: null });
		try {
			await tauriInvoke("async_rename", { path: from, newName });
			set({ isLoading: false });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
			throw err;
		}
	},

	extractEntries: async (paths: string[]) => {
		set({ isLoading: true, error: null });
		try {
			await Promise.all(
				paths.map((p) => tauriInvoke("async_extract_here", { path: p })),
			);
			set({ isLoading: false, selectedPaths: new Set() });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
			throw err;
		}
	},

	extractEntriesToFolder: async (paths: string[]) => {
		return get().extractEntries(paths);
	},

	extractEntriesToDialog: async (paths: string[]) => {
		const { currentPath } = get();
		try {
			const selectedDir = await openDialog({
				directory: true,
				multiple: false,
				defaultPath: currentPath,
				title: "Select Destination to Extract",
			});

			if (!selectedDir) return;

			set({ isLoading: true, error: null });
			await Promise.all(
				paths.map((p) =>
					tauriInvoke("async_extract", {
						path: p,
						dest: selectedDir as string,
					}),
				),
			);
			set({ isLoading: false, selectedPaths: new Set() });
		} catch (err) {
			set({ error: extractError(err), isLoading: false });
			throw err;
		}
	},
});
