import { useVirtualizer } from "@tanstack/react-virtual";
import { Folder } from "lucide-react";
import React, { useMemo, useRef, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { toast } from "sonner";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import type { RichFileEntry as FileEntry } from "@/types/fs";
import { EntryItem } from "./entry-item";
import { FileExplorerContextMenu } from "./file-explorer-context-menu";
import { renderProgressToast } from "./progress-toast";
import { useFileExplorerHotkeys } from "./use-file-explorer-hotkeys";
import { useFileExplorerSelection } from "./use-file-explorer-selection";

const PropertiesDialog = lazy(() => import("./properties-dialog").then(m => ({ default: m.PropertiesDialog })));
const BulkRenameDialog = lazy(() => import("./bulk-rename-dialog").then(m => ({ default: m.BulkRenameDialog })));
const NewFolderDialog = lazy(() => import("./new-folder-dialog").then(m => ({ default: m.NewFolderDialog })));
const RenameDialog = lazy(() => import("./rename-dialog").then(m => ({ default: m.RenameDialog })));

interface FileExplorerProps {
	entries: FileEntry[];
	onEntryDoubleClick: (entry: FileEntry) => void;
}

interface EntryGridProps {
	items: FileEntry[];
	selectedPaths: Set<string>;
	onEntryDoubleClick: (entry: FileEntry) => void;
	onSingleClick: (e: React.MouseEvent, entry: FileEntry) => void;
	setPropertiesEntry: (entry: FileEntry | null) => void;
	onRequestDelete: (entry: FileEntry) => void;
	setRenamingEntry: (entry: FileEntry) => void;
	isInTrash: boolean;
	hasClipboard: boolean;
}

const EntryGrid = ({
	items,
	selectedPaths,
	onEntryDoubleClick,
	onSingleClick,
	setPropertiesEntry,
	onRequestDelete,
	setRenamingEntry,
	isInTrash,
	hasClipboard,
}: EntryGridProps) => {
	const parentRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);

	useEffect(() => {
		if (!parentRef.current) return;
		const observer = new ResizeObserver((entries) => {
			setContainerWidth(entries[0].contentRect.width);
		});
		observer.observe(parentRef.current);
		return () => observer.disconnect();
	}, []);

	const COLUMN_WIDTH = 110;
	const COLUMN_GAP = 8;
	const ROW_HEIGHT = 120;
	const cols = Math.max(1, Math.floor((containerWidth + COLUMN_GAP) / (COLUMN_WIDTH + COLUMN_GAP)));
	const rowCount = Math.ceil(items.length / cols);

	const rowVirtualizer = useVirtualizer({
		count: rowCount,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 5,
	});

	return (
		<div
			ref={parentRef}
			className="relative h-full overflow-y-auto overflow-x-hidden p-4 scrollbar-thin"
		>
			<div
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
					const startIndex = virtualRow.index * cols;
					const rowItems = items.slice(startIndex, startIndex + cols);

					return (
						<div
							key={virtualRow.key}
							className="absolute top-0 left-0 grid w-full gap-2"
							style={{
								height: `${ROW_HEIGHT}px`,
								transform: `translateY(${virtualRow.start}px)`,
								gridTemplateColumns: `repeat(${cols}, 1fr)`,
							}}
						>
							{rowItems.map((entry) => (
								<EntryItem
									key={entry.path}
									entry={entry}
									isSelected={selectedPaths.has(entry.path)}
									isMultiSelected={
										selectedPaths.has(entry.path) && selectedPaths.size > 1
									}
									isInTrash={isInTrash}
									hasClipboard={hasClipboard}
									onSingleClick={onSingleClick}
									onDoubleClick={onEntryDoubleClick}
									onOpenProperties={setPropertiesEntry}
									onRequestDelete={onRequestDelete}
									onRequestRename={setRenamingEntry}
								/>
							))}
						</div>
					);
				})}
			</div>
			{items.length === 0 && (
				<div className="flex flex-col items-center justify-center gap-3 py-24">
					<div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/20">
						<Folder size={22} className="text-muted-foreground opacity-40" />
					</div>
					<p className="text-muted-foreground text-xs opacity-60">This folder is empty</p>
				</div>
			)}
		</div>
	);
};

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

	const gridRef = useRef<HTMLDivElement>(null);
	const selectionBoxRef = useRef<HTMLDivElement>(null);

	const { visualEntries } = useMemo(() => {
		const folders = entries.filter((e) => e.is_dir);
		const files = entries.filter((e) => !e.is_dir);
		return { visualEntries: [...folders, ...files] };
	}, [entries]);

	const isInTrash = useMemo(
		() => currentPath.includes(".local/share/Trash"),
		[currentPath],
	);
	const hasClipboard = !!clipboard;

	const clearSelection = useFileSystemStore((s) => s.clearSelection);
	const pasteClipboard = useFileSystemStore((s) => s.pasteClipboard);
	const deleteEntriesAction = useFileSystemStore((s) => s.deleteEntries);
	const trashEntriesAction = useFileSystemStore((s) => s.trashEntries);
	const extractEntriesAction = useFileSystemStore((s) => s.extractEntries);
	const createDirectory = useFileSystemStore((s) => s.createDirectory);
	const renameEntryAction = useFileSystemStore((s) => s.renameEntry);
	const setBulkRenamingEntries = useFileSystemStore((s) => s.setBulkRenamingEntries);

	const { isSelecting, handlePointerDown, isDragging } =
		useFileExplorerSelection(gridRef, selectionBoxRef);

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
			{
				icon: null,
			},
		);
		try {
			await pasteClipboard((done, total) => {
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

	const handleDelete = useCallback(
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
					await deleteEntriesAction(paths);
					toast.success(`Permanently deleted ${name}`, { id: toastId });
				} else {
					await trashEntriesAction(paths);
					toast.success(`Moved ${name} to Trash`, { id: toastId });
				}
			} catch (err) {
				toast.error(
					`Failed to ${isInTrash ? "permanently delete" : "trash"} ${name}: ${err}`,
					{ id: toastId },
				);
			}
		},
		[isInTrash, deleteEntriesAction, trashEntriesAction],
	);

	const handleExtract = async (targets: FileEntry[]) => {
		if (targets.length === 0) return;
		const count = targets.length;
		const name = count === 1 ? targets[0].name : `${count} archives`;
		const paths = targets.map((t) => t.path);
		toast.promise(extractEntriesAction(paths), {
			loading: `Extracting ${name}...`,
			success: `Started extraction of ${name}`,
			error: `Failed to start extraction: ${name}`,
		});
	};

	const isAnyDialogOpen =
		newFolderOpen ||
		!!propertiesEntry ||
		!!renamingEntry ||
		bulkRenamingEntries.length > 0;

	useFileExplorerHotkeys({
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
	});

	const handleSingleClick = useCallback(
		(e: React.MouseEvent, entry: FileEntry) => {
			if (e.shiftKey && lastClickedPathRef.current) {
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
					for (let i = min; i <= max; i++)
						newSelection.add(visualEntries[i].path);
					useFileSystemStore.setState({ selectedPaths: newSelection });
				}
			} else {
				useFileSystemStore
					.getState()
					.selectEntry(entry.path, e.ctrlKey || e.metaKey);
				lastClickedPathRef.current = entry.path;
			}
		},
		[visualEntries],
	);

	const handleRequestDelete = useCallback(
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

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<div
							className={cn(
								"relative h-full min-h-[400px] outline-none",
								isSelecting ? "select-none" : "",
							)}
							onPointerDown={handlePointerDown}
							onClick={(e) => {
								if (isDragging.current) return;
								if (e.target === e.currentTarget)
									clearSelection();
							}}
						>
							<EntryGrid
								items={visualEntries}
								selectedPaths={selectedPaths}
								onEntryDoubleClick={onEntryDoubleClick}
								onSingleClick={handleSingleClick}
								setPropertiesEntry={setPropertiesEntry}
								onRequestDelete={handleRequestDelete}
								setRenamingEntry={setRenamingEntry}
								isInTrash={isInTrash}
								hasClipboard={hasClipboard}
							/>
							{isSelecting && (
								<div
									ref={selectionBoxRef}
									className="pointer-events-none fixed z-50 border border-primary/50 bg-primary/20"
									style={{ display: "none" }}
								/>
							)}
						</div>
					}
				/>
				<FileExplorerContextMenu
					selectedPaths={selectedPaths}
					entries={entries}
					isInTrash={isInTrash}
					setNewFolderOpen={setNewFolderOpen}
					setRenamingEntry={setRenamingEntry}
					handleDelete={handleDelete}
				/>
			</ContextMenu>

			<Suspense fallback={null}>
				<NewFolderDialog
					open={newFolderOpen}
					onClose={() => setNewFolderOpen(false)}
					onCreate={async (name) => {
						createDirectory(name);
						setNewFolderOpen(false);
					}}
				/>
				{renamingEntry && (
					<RenameDialog
						open={!!renamingEntry}
						initialName={renamingEntry.name}
						onClose={() => setRenamingEntry(null)}
						onRename={async (name) => {
							await renameEntryAction(renamingEntry.path, name);
							setRenamingEntry(null);
						}}
					/>
				)}
				<BulkRenameDialog
					open={bulkRenamingEntries.length > 0}
					entries={bulkRenamingEntries}
					onClose={() => setBulkRenamingEntries([])}
					onRename={async (mappings) => {
						for (const m of mappings)
							await renameEntryAction(m.from, m.to);
						setBulkRenamingEntries([]);
					}}
				/>
				{propertiesEntry && (
					<PropertiesDialog
						open={!!propertiesEntry}
						entry={propertiesEntry}
						onClose={() => setPropertiesEntry(null)}
					/>
				)}
			</Suspense>
		</>
	);
}
