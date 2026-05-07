import { useHotkeys } from "@tanstack/react-hotkeys";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useFileSystemStore } from "@/store/use-file-system-store";
import type { RichFileEntry as FileEntry } from "@/types/fs";

interface UseFileExplorerHotkeysProps {
	entries: FileEntry[];
	selectedPaths: Set<string>;
	visualEntries: FileEntry[];
	isAnyDialogOpen: boolean;
	onEntryDoubleClick: (entry: FileEntry) => void;
	handlePaste: () => Promise<void>;
	handleDelete: (targets: FileEntry[]) => Promise<void>;
	setRenamingEntry: (entry: FileEntry | null) => void;
	setPropertiesEntry: (entry: FileEntry | null) => void;
	setNewFolderOpen: (open: boolean) => void;
	handleExtract: (targets: FileEntry[]) => Promise<void>;
	getGridColumns: () => number;
	lastClickedPathRef: React.MutableRefObject<string | null>;
}

export function useFileExplorerHotkeys({
	entries,
	selectedPaths,
	visualEntries,
	isAnyDialogOpen,
	onEntryDoubleClick,
	handlePaste,
	handleDelete,
	setRenamingEntry,
	setPropertiesEntry,
	setNewFolderOpen,
	handleExtract,
	getGridColumns,
	lastClickedPathRef,
}: UseFileExplorerHotkeysProps) {
	useHotkeys([
		{
			hotkey: "Mod+C",
			callback: async () => {
				const paths = Array.from(selectedPaths);
				if (paths.length > 0) {
					const name =
						paths.length > 1
							? `${paths.length} items`
							: entries.find((e) => e.path === paths[0])?.name || "item";
					useFileSystemStore
						.getState()
						.setClipboard({ paths, name, op: "copy" });
					try {
						await invoke("copy_files_to_system_clipboard", { paths });
					} catch (err) {
						console.warn("[lingfm] Ctrl+C system clipboard failed:", err);
						navigator.clipboard.writeText(paths.join("\n")).catch(() => {});
					}
					toast.success(`Copied ${name}`);
				}
			},
			options: { enabled: !isAnyDialogOpen && selectedPaths.size > 0 },
		},
		{
			hotkey: "Mod+X",
			callback: async () => {
				const paths = Array.from(selectedPaths);
				if (paths.length > 0) {
					const name =
						paths.length > 1
							? `${paths.length} items`
							: entries.find((e) => e.path === paths[0])?.name || "item";
					useFileSystemStore
						.getState()
						.setClipboard({ paths, name, op: "cut" });
					try {
						await invoke("copy_files_to_system_clipboard", { paths });
					} catch (err) {
						console.warn("[lingfm] Ctrl+X system clipboard failed:", err);
						navigator.clipboard.writeText(paths.join("\n")).catch(() => {});
					}
					toast.success(`Cut ${name}`);
				}
			},
			options: { enabled: !isAnyDialogOpen && selectedPaths.size > 0 },
		},
		{
			hotkey: "Mod+V",
			callback: handlePaste,
			options: {
				enabled: !isAnyDialogOpen && !!useFileSystemStore.getState().clipboard,
			},
		},
		{
			hotkey: "Mod+Z",
			callback: async () => {
				try {
					await useFileSystemStore.getState().undoTrash();
					toast.success("Undo successful");
				} catch (err) {
					toast.error(`Undo failed: ${err}`);
				}
			},
			options: { enabled: !isAnyDialogOpen },
		},
		{
			hotkey: "Mod+Shift+N",
			callback: () => setNewFolderOpen(true),
			options: { enabled: !isAnyDialogOpen },
		},
		{
			hotkey: "F2",
			callback: () => {
				const selected = entries.filter((e) => selectedPaths.has(e.path));
				if (selected.length === 1) {
					setRenamingEntry(selected[0]);
				} else if (selected.length > 1) {
					useFileSystemStore.getState().setBulkRenamingEntries(selected);
				}
			},
			options: { enabled: !isAnyDialogOpen && selectedPaths.size > 0 },
		},
		{
			hotkey: "Mod+E",
			callback: () => {
				const selected = entries.filter((e) => selectedPaths.has(e.path));
				const archives = selected.filter((e) =>
					/\.(zip|rar|7z|tar|gz|xz|bz2|zst)$/i.test(e.name),
				);
				handleExtract(archives);
			},
			options: {
				enabled:
					!isAnyDialogOpen &&
					entries.some(
						(e) =>
							selectedPaths.has(e.path) &&
							/\.(zip|rar|7z|tar|gz|xz|bz2|zst)$/i.test(e.name),
					),
			},
		},
		{
			hotkey: "Mod+A",
			callback: () => useFileSystemStore.getState().selectAll(),
			options: { enabled: !isAnyDialogOpen && entries.length > 0 },
		},
		{
			hotkey: "Delete",
			callback: () => {
				const targets = entries.filter((e) => selectedPaths.has(e.path));
				handleDelete(targets);
			},
			options: { enabled: !isAnyDialogOpen && selectedPaths.size > 0 },
		},
		{
			hotkey: "Alt+Enter",
			callback: () => {
				const entry = entries.find((e) => selectedPaths.has(e.path));
				if (entry) setPropertiesEntry(entry);
			},
			options: { enabled: !isAnyDialogOpen && selectedPaths.size > 0 },
		},
		{
			hotkey: "Enter",
			callback: () => {
				const entry = entries.find((e) => selectedPaths.has(e.path));
				if (entry) onEntryDoubleClick(entry);
			},
			options: { enabled: !isAnyDialogOpen && selectedPaths.size > 0 },
		},
		{
			hotkey: "ArrowRight",
			callback: () => {
				const lastSelectedIndex = visualEntries.findIndex((e) =>
					selectedPaths.has(e.path),
				);
				const i =
					lastSelectedIndex === -1
						? 0
						: (lastSelectedIndex + 1) % visualEntries.length;
				if (visualEntries[i]) {
					useFileSystemStore
						.getState()
						.selectEntry(visualEntries[i].path, false);
					lastClickedPathRef.current = visualEntries[i].path;
				}
			},
			options: { enabled: !isAnyDialogOpen && entries.length > 0 },
		},
		{
			hotkey: "ArrowLeft",
			callback: () => {
				const lastSelectedIndex = visualEntries.findIndex((e) =>
					selectedPaths.has(e.path),
				);
				const i =
					lastSelectedIndex === -1
						? visualEntries.length - 1
						: (lastSelectedIndex - 1 + visualEntries.length) %
							visualEntries.length;
				if (visualEntries[i]) {
					useFileSystemStore
						.getState()
						.selectEntry(visualEntries[i].path, false);
					lastClickedPathRef.current = visualEntries[i].path;
				}
			},
			options: { enabled: !isAnyDialogOpen && entries.length > 0 },
		},
		{
			hotkey: "ArrowDown",
			callback: () => {
				const lastSelectedIndex = visualEntries.findIndex((e) =>
					selectedPaths.has(e.path),
				);
				const cols = getGridColumns();
				const i =
					lastSelectedIndex === -1
						? 0
						: (lastSelectedIndex + cols) % visualEntries.length;
				if (visualEntries[i]) {
					useFileSystemStore
						.getState()
						.selectEntry(visualEntries[i].path, false);
					lastClickedPathRef.current = visualEntries[i].path;
				}
			},
			options: { enabled: !isAnyDialogOpen && entries.length > 0 },
		},
		{
			hotkey: "ArrowUp",
			callback: () => {
				const lastSelectedIndex = visualEntries.findIndex((e) =>
					selectedPaths.has(e.path),
				);
				const cols = getGridColumns();
				const i =
					lastSelectedIndex === -1
						? visualEntries.length - 1
						: (lastSelectedIndex - cols + visualEntries.length) %
							visualEntries.length;
				if (visualEntries[i]) {
					useFileSystemStore
						.getState()
						.selectEntry(visualEntries[i].path, false);
					lastClickedPathRef.current = visualEntries[i].path;
				}
			},
			options: { enabled: !isAnyDialogOpen && entries.length > 0 },
		},
	]);
}
