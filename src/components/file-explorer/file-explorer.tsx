import { useHotkeys } from "@tanstack/react-hotkeys";
import { invoke } from "@tauri-apps/api/core";
import {
	Copy,
	Folder,
	FolderPlus,
	Pencil,
	RefreshCw,
	Scissors,
	Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PropertiesDialog } from "@/components/properties-dialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import type { RichFileEntry as FileEntry } from "@/types/fs";
import { BulkRenameDialog } from "./bulk-rename-dialog";
import { EntryItem } from "./entry-item";
import { NewFolderDialog } from "./new-folder-dialog";
import { RenameDialog } from "./rename-dialog";

interface FileExplorerProps {
	entries: FileEntry[];
	onEntryDoubleClick: (entry: FileEntry) => void;
}

const CircularProgress = ({
	value,
	size = 20,
	strokeWidth = 2.5,
}: {
	value: number;
	size?: number;
	strokeWidth?: number;
}) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (value / 100) * circumference;

	return (
		<svg width={size} height={size} className="transform -rotate-90 shrink-0">
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke="currentColor"
				strokeWidth={strokeWidth}
				fill="transparent"
				className="text-muted-foreground/20"
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke="currentColor"
				strokeWidth={strokeWidth}
				fill="transparent"
				strokeDasharray={circumference}
				style={{ strokeDashoffset: offset }}
				className="text-primary transition-all duration-300 ease-in-out"
				strokeLinecap="round"
			/>
		</svg>
	);
};

const renderProgressToast = (label: string, done: number, total: number) => {
	const percentage = (done / total) * 100;
	return (
		<div className="flex items-center gap-3 w-full min-w-[220px]">
			<CircularProgress value={percentage} />
			<div className="flex flex-col overflow-hidden">
				<span className="text-sm font-medium truncate">{label}</span>
				<span className="text-xs text-muted-foreground">
					{done} / {total} files
				</span>
			</div>
		</div>
	);
};

const SectionLabel = ({ label }: { label: string }) => (
	<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] mb-2 mt-0.5 px-0.5 opacity-70">
		{label}
	</p>
);

interface EntryGridProps {
	items: FileEntry[];
	gridRef: React.RefObject<HTMLDivElement | null>;
	selectedPaths: Set<string>;
	onEntryDoubleClick: (entry: FileEntry) => void;
	onSingleClick: (e: React.MouseEvent, entry: FileEntry) => void;
	setPropertiesEntry: (entry: FileEntry | null) => void;
	onRequestDelete: (entry: FileEntry) => void;
	setRenamingEntry: (entry: FileEntry) => void;
}

const EntryGrid = ({
	items,
	gridRef,
	selectedPaths,
	onEntryDoubleClick,
	onSingleClick,
	setPropertiesEntry,
	onRequestDelete,
	setRenamingEntry,
}: EntryGridProps) => (
	<div
		ref={gridRef}
		className="grid gap-0.5"
		style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}
	>
		{items.map((entry) => (
			<EntryItem
				key={entry.path}
				entry={entry}
				isSelected={selectedPaths.has(entry.path)}
				isMultiSelected={
					selectedPaths.has(entry.path) && selectedPaths.size > 1
				}
				onSingleClick={onSingleClick}
				onDoubleClick={onEntryDoubleClick}
				onOpenProperties={setPropertiesEntry}
				onRequestDelete={onRequestDelete}
				onRequestRename={setRenamingEntry}
			/>
		))}
	</div>
);

export function FileExplorer({
	entries,
	onEntryDoubleClick,
}: FileExplorerProps) {
	const selectedPaths = useFileSystemStore((s) => s.selectedPaths);
	const clipboard = useFileSystemStore((s) => s.clipboard);
	const currentPath = useFileSystemStore((s) => s.currentPath);
	const bulkRenamingEntries = useFileSystemStore((s) => s.bulkRenamingEntries);

	const [renamingEntry, setRenamingEntry] = useState<FileEntry | null>(null);
	const [propertiesEntry, setPropertiesEntry] = useState<FileEntry | null>(
		null,
	);
	const [newFolderOpen, setNewFolderOpen] = useState(false);
	const lastClickedPathRef = useRef<string | null>(null);
	const [selectionBox, setSelectionBox] = useState<{
		startX: number;
		startY: number;
		x: number;
		y: number;
		w: number;
		h: number;
	} | null>(null);
	const initialSelectionRef = useRef<Set<string>>(new Set());
	const gridRef = useRef<HTMLDivElement>(null);
	const isDraggingRef = useRef(false);

	const visualEntriesRef = useRef<FileEntry[]>([]);

	const folders = entries.filter((e) => e.is_dir);
	const files = entries.filter((e) => !e.is_dir);
	visualEntriesRef.current = [...folders, ...files];
	const isInTrash = currentPath.includes(".local/share/Trash");

	const getGridColumns = () => {
		if (!gridRef.current) return 1;
		return window
			.getComputedStyle(gridRef.current)
			.gridTemplateColumns.split(" ").length;
	};

	const handlePaste = async () => {
		if (!clipboard) return;
		const { name, paths } = clipboard;
		const totalPaths = paths.length;
		const toastId = toast.loading(
			renderProgressToast(`Pasting ${name}...`, 0, totalPaths),
			{ icon: null },
		);
		try {
			await useFileSystemStore.getState().pasteClipboard((done, total) => {
				toast.loading(renderProgressToast(`Pasting ${name}...`, done, total), {
					id: toastId,
					icon: null,
				});
			});
			toast.success(`Pasted ${name}`, { id: toastId });
		} catch {
			toast.error(`Failed to paste ${name}`, { id: toastId });
		}
	};

	const handleDelete = React.useCallback(
		async (targets: FileEntry[]) => {
			if (targets.length === 0) return;

			const count = targets.length;
			const name = count === 1 ? targets[0].name : `${count} items`;
			const paths = targets.map((t) => t.path);

			const toastId = toast.loading(
				renderProgressToast(
					`${isInTrash ? "Permanently deleting" : "Trashing"} ${name}...`,
					0,
					paths.length,
				),
				{ icon: null },
			);

			try {
				if (isInTrash) {
					await useFileSystemStore.getState().deleteEntries(paths);
					toast.success(`Permanently deleted ${name}`, { id: toastId });
					return;
				}

				await useFileSystemStore.getState().trashEntries(paths);
				toast.success(`Moved ${name} to Trash`, { id: toastId });
			} catch (err) {
				toast.error(
					`Failed to ${isInTrash ? "permanently delete" : "trash"} ${name}: ${err}`,
					{ id: toastId },
				);
			}
		},
		[isInTrash],
	);

	const handleRename = async (newName: string) => {
		if (!renamingEntry) return;
		const oldName = renamingEntry.name;
		const toastId = toast.loading(`Renaming ${oldName}...`);
		try {
			await useFileSystemStore
				.getState()
				.renameEntry(renamingEntry.path, newName);
			toast.success(`Renamed ${oldName} to ${newName}`, { id: toastId });
		} catch (err) {
			toast.error(`Failed to rename: ${err}`, { id: toastId });
		}
	};

	const handleBulkRename = async (mappings: { from: string; to: string }[]) => {
		const toastId = toast.loading(`Renaming ${mappings.length} items...`);
		try {
			for (const m of mappings) {
				await useFileSystemStore.getState().renameEntry(m.from, m.to);
			}
			toast.success(`Renamed ${mappings.length} items`, { id: toastId });
		} catch (err) {
			toast.error(`Bulk rename failed: ${err}`, { id: toastId });
		}
	};

	const handleCreateDirectory = (name: string) => {
		toast.promise(useFileSystemStore.getState().createDirectory(name), {
			loading: `Creating folder "${name}"...`,
			success: `Created "${name}"`,
			error: `Failed to create "${name}"`,
		});
	};

	const handleSingleClick = React.useCallback(
		(e: React.MouseEvent, entry: FileEntry) => {
			if (e.shiftKey && lastClickedPathRef.current) {
				const visualEntries = visualEntriesRef.current;
				const startIndex = visualEntries.findIndex(
					(v) => v.path === lastClickedPathRef.current,
				);
				const endIndex = visualEntries.findIndex((v) => v.path === entry.path);
				if (startIndex !== -1 && endIndex !== -1) {
					const min = Math.min(startIndex, endIndex);
					const max = Math.max(startIndex, endIndex);
					const state = useFileSystemStore.getState();
					const newSelection = new Set(
						e.ctrlKey || e.metaKey ? state.selectedPaths : [],
					);
					for (let i = min; i <= max; i++) {
						newSelection.add(visualEntries[i].path);
					}
					useFileSystemStore.setState({ selectedPaths: newSelection });
				}
			} else {
				useFileSystemStore
					.getState()
					.selectEntry(entry.path, e.ctrlKey || e.metaKey);
				lastClickedPathRef.current = entry.path;
			}
		},
		[],
	);

	const handleEntryDoubleClick = React.useCallback(
		(entry: FileEntry) => {
			onEntryDoubleClick(entry);
		},
		[onEntryDoubleClick],
	);

	const handlePropertiesEntry = React.useCallback((entry: FileEntry | null) => {
		setPropertiesEntry(entry);
	}, []);

	const handleRequestDelete = React.useCallback(
		(entry: FileEntry) => {
			const state = useFileSystemStore.getState();
			if (state.selectedPaths.has(entry.path)) {
				const targets = state.entries.filter((e) =>
					state.selectedPaths.has(e.path),
				);
				handleDelete(targets);
			} else {
				handleDelete([entry]);
			}
		},
		[handleDelete],
	);

	const handleRenamingEntry = React.useCallback((entry: FileEntry) => {
		setRenamingEntry(entry);
	}, []);

	const isAnyDialogOpen =
		newFolderOpen ||
		!!propertiesEntry ||
		!!renamingEntry ||
		bulkRenamingEntries.length > 0;

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
			options: { enabled: !isAnyDialogOpen && !!clipboard },
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
				const visualEntries = [...folders, ...files];
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
				const visualEntries = [...folders, ...files];
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
				const visualEntries = [...folders, ...files];
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
				const visualEntries = visualEntriesRef.current;
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
	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if ((e.target as HTMLElement).closest("[data-path]")) return;
		if (e.button !== 0) return;

		if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
			useFileSystemStore.getState().clearSelection();
			initialSelectionRef.current = new Set();
		} else {
			initialSelectionRef.current = new Set(selectedPaths);
		}

		setSelectionBox({
			startX: e.clientX,
			startY: e.clientY,
			x: e.clientX,
			y: e.clientY,
			w: 0,
			h: 0,
		});
		isDraggingRef.current = false;
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: Only rebind when selectionBox toggles
	useEffect(() => {
		if (!selectionBox) return;

		const handlePointerMove = (e: PointerEvent) => {
			const currentX = e.clientX;
			const currentY = e.clientY;

			const dx = Math.abs(currentX - selectionBox.startX);
			const dy = Math.abs(currentY - selectionBox.startY);

			if (!isDraggingRef.current && (dx > 5 || dy > 5)) {
				isDraggingRef.current = true;
			}

			const newBox = {
				startX: selectionBox.startX,
				startY: selectionBox.startY,
				x: Math.min(selectionBox.startX, currentX),
				y: Math.min(selectionBox.startY, currentY),
				w: dx,
				h: dy,
			};

			setSelectionBox(newBox);

			const newSelected = new Set(initialSelectionRef.current);

			const elements = document.querySelectorAll("[data-path]");
			elements.forEach((el) => {
				const rect = el.getBoundingClientRect();
				const intersect = !(
					rect.right < newBox.x ||
					rect.left > newBox.x + newBox.w ||
					rect.bottom < newBox.y ||
					rect.top > newBox.y + newBox.h
				);

				const path = el.getAttribute("data-path");
				if (path) {
					if (intersect) {
						newSelected.add(path);
					} else if (!initialSelectionRef.current.has(path)) {
						newSelected.delete(path);
					}
				}
			});

			useFileSystemStore.setState({ selectedPaths: newSelected });
		};

		const handlePointerUp = () => {
			setSelectionBox(null);
			// Delay resetting isDraggingRef to allow onClick to see it
			setTimeout(() => {
				isDraggingRef.current = false;
			}, 50);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [selectionBox === null]); // Re-bind only when box starts/ends

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<div
							className={cn(
								"min-h-full outline-none relative",
								selectionBox ? "select-none" : "",
							)}
							onPointerDown={handlePointerDown}
							onClick={(e) => {
								if (isDraggingRef.current) return;
								// Only clear selection if clicking directly on the background (the currentTarget)
								if (e.target === e.currentTarget)
									useFileSystemStore.getState().clearSelection();
							}}
						>
							{selectionBox && (
								<div
									className="fixed z-50 bg-primary/20 border border-primary/50 pointer-events-none"
									style={{
										left: selectionBox.x,
										top: selectionBox.y,
										width: selectionBox.w,
										height: selectionBox.h,
									}}
								/>
							)}
							<div className="p-4 space-y-5">
								{folders.length > 0 && (
									<section>
										<SectionLabel label="Folders" />
										<EntryGrid
											items={folders}
											gridRef={gridRef}
											selectedPaths={selectedPaths}
											onEntryDoubleClick={handleEntryDoubleClick}
											onSingleClick={handleSingleClick}
											setPropertiesEntry={handlePropertiesEntry}
											onRequestDelete={handleRequestDelete}
											setRenamingEntry={handleRenamingEntry}
										/>
									</section>
								)}

								{files.length > 0 && (
									<section>
										{folders.length > 0 && <SectionLabel label="Files" />}
										<EntryGrid
											items={files}
											gridRef={gridRef}
											selectedPaths={selectedPaths}
											onEntryDoubleClick={handleEntryDoubleClick}
											onSingleClick={handleSingleClick}
											setPropertiesEntry={handlePropertiesEntry}
											onRequestDelete={handleRequestDelete}
											setRenamingEntry={handleRenamingEntry}
										/>
									</section>
								)}

								{entries.length === 0 && (
									<div className="flex flex-col items-center justify-center py-24 gap-3">
										<div className="w-12 h-12 rounded-lg bg-[var(--muted)] border border-border flex items-center justify-center">
											<Folder
												size={22}
												className="text-muted-foreground opacity-40"
											/>
										</div>
										<p className="text-xs text-muted-foreground opacity-60">
											This folder is empty
										</p>
									</div>
								)}
							</div>
						</div>
					}
				/>

				<ContextMenuContent className="w-52 bg-popover border border-border shadow-lg rounded-lg p-1">
					{!isInTrash && (
						<>
							<ContextMenuItem
								onClick={() => setNewFolderOpen(true)}
								className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
							>
								<FolderPlus size={13} className="text-muted-foreground" />
								New Folder
								<ContextMenuShortcut className="text-muted-foreground text-[10px]">
									⌘⇧N
								</ContextMenuShortcut>
							</ContextMenuItem>

							{selectedPaths.size > 0 && (
								<>
									<ContextMenuSeparator className="bg-border my-1" />
									<ContextMenuItem
										onClick={() => {
											const currentSelected =
												useFileSystemStore.getState().selectedPaths;
											const selected = entries.filter((e) =>
												currentSelected.has(e.path),
											);
											if (selected.length === 1) {
												setRenamingEntry(selected[0]);
											} else if (selected.length > 1) {
												useFileSystemStore
													.getState()
													.setBulkRenamingEntries(selected);
											}
										}}
										className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
									>
										<Pencil size={13} className="text-muted-foreground" />
										{selectedPaths.size > 1 ? "Bulk Rename" : "Rename"}
										<ContextMenuShortcut className="text-muted-foreground text-[10px]">
											F2
										</ContextMenuShortcut>
									</ContextMenuItem>

									<ContextMenuItem
										onClick={async () => {
											const paths = Array.from(selectedPaths);
											const name =
												paths.length > 1
													? `${paths.length} items`
													: entries.find((e) => e.path === paths[0])?.name ||
														"item";
											useFileSystemStore
												.getState()
												.setClipboard({ paths, name, op: "copy" });
											try {
												await invoke("copy_files_to_system_clipboard", {
													paths,
												});
											} catch (err) {
												console.warn("[lingfm] Context menu copy failed:", err);
												navigator.clipboard
													.writeText(paths.join("\n"))
													.catch(() => {});
											}
											toast.success(`Copied ${name}`);
										}}
										className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
									>
										<Copy size={13} className="text-muted-foreground" />
										Copy
										<ContextMenuShortcut className="text-muted-foreground text-[10px]">
											⌘C
										</ContextMenuShortcut>
									</ContextMenuItem>

									<ContextMenuItem
										onClick={async () => {
											const paths = Array.from(selectedPaths);
											const name =
												paths.length > 1
													? `${paths.length} items`
													: entries.find((e) => e.path === paths[0])?.name ||
														"item";
											useFileSystemStore
												.getState()
												.setClipboard({ paths, name, op: "cut" });
											try {
												await invoke("copy_files_to_system_clipboard", {
													paths,
												});
											} catch (err) {
												console.warn("[lingfm] Context menu cut failed:", err);
												navigator.clipboard
													.writeText(paths.join("\n"))
													.catch(() => {});
											}
											toast.success(`Cut ${name}`);
										}}
										className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
									>
										<Scissors size={13} className="text-muted-foreground" />
										Cut
										<ContextMenuShortcut className="text-muted-foreground text-[10px]">
											⌘X
										</ContextMenuShortcut>
									</ContextMenuItem>

									<ContextMenuItem
										variant="destructive"
										onClick={() => {
											const targets = entries.filter((e) =>
												selectedPaths.has(e.path),
											);
											handleDelete(targets);
										}}
										className="gap-2 text-xs focus:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] hover:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
									>
										<Trash2 size={13} />
										{isInTrash ? "Delete Permanently" : "Delete"}
										<ContextMenuShortcut className="opacity-40 text-[10px]">
											{isInTrash ? "⇧⌫" : "⌫"}
										</ContextMenuShortcut>
									</ContextMenuItem>
								</>
							)}

							<ContextMenuSeparator className="bg-border my-1" />

							<ContextMenuItem
								onClick={handlePaste}
								disabled={!clipboard}
								className={cn(
									"gap-2 text-xs rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default",
									clipboard
										? "text-foreground hover:bg-accent hover:text-accent-foreground"
										: "text-muted-foreground opacity-40 pointer-events-none",
								)}
							>
								<FolderPlus size={13} className="text-muted-foreground" />
								Paste
								{clipboard && (
									<span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[70px]">
										{clipboard.name}
									</span>
								)}
								<ContextMenuShortcut className="text-muted-foreground text-[10px]">
									⌘V
								</ContextMenuShortcut>
							</ContextMenuItem>

							<ContextMenuSeparator className="bg-border my-1" />
						</>
					)}

					<ContextMenuItem
						onClick={() => useFileSystemStore.getState().refresh()}
						className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
					>
						<RefreshCw size={13} className="text-muted-foreground" />
						Refresh
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<NewFolderDialog
				open={newFolderOpen}
				onClose={() => setNewFolderOpen(false)}
				onCreate={handleCreateDirectory}
			/>

			<RenameDialog
				open={!!renamingEntry}
				initialName={renamingEntry?.name || ""}
				onClose={() => setRenamingEntry(null)}
				onRename={handleRename}
			/>

			<BulkRenameDialog
				open={bulkRenamingEntries.length > 0}
				entries={bulkRenamingEntries}
				onClose={() => useFileSystemStore.getState().setBulkRenamingEntries([])}
				onRename={handleBulkRename}
			/>

			<PropertiesDialog
				entry={propertiesEntry}
				open={!!propertiesEntry}
				onClose={() => setPropertiesEntry(null)}
			/>
		</>
	);
}
