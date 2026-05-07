import { Folder } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PropertiesDialog } from "./properties-dialog";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import type { RichFileEntry as FileEntry } from "@/types/fs";
import { BulkRenameDialog } from "./bulk-rename-dialog";
import { EntryItem } from "./entry-item";
import { FileExplorerContextMenu } from "./file-explorer-context-menu";
import { NewFolderDialog } from "./new-folder-dialog";
import { renderProgressToast } from "./progress-toast";
import { RenameDialog } from "./rename-dialog";
import { useFileExplorerHotkeys } from "./use-file-explorer-hotkeys";
import { useFileExplorerSelection } from "./use-file-explorer-selection";

interface FileExplorerProps {
	entries: FileEntry[];
	onEntryDoubleClick: (entry: FileEntry) => void;
}

const SectionLabel = ({ label }: { label: string }) => (
	<p className="mt-0.5 mb-2 px-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-[0.07em] opacity-70">
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

	const gridRef = useRef<HTMLDivElement>(null);
	const selectionBoxRef = useRef<HTMLDivElement>(null);

	const folders = entries.filter((e) => e.is_dir);
	const files = entries.filter((e) => !e.is_dir);
	const visualEntries = useMemo(() => [...folders, ...files], [folders, files]);
	const isInTrash = currentPath.includes(".local/share/Trash");

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
				} else {
					await useFileSystemStore.getState().trashEntries(paths);
					toast.success(`Moved ${name} to Trash`, { id: toastId });
				}
			} catch (err) {
				toast.error(
					`Failed to ${isInTrash ? "permanently delete" : "trash"} ${name}: ${err}`,
					{ id: toastId },
				);
			}
		},
		[isInTrash],
	);

	const handleExtract = async (targets: FileEntry[]) => {
		if (targets.length === 0) return;
		const count = targets.length;
		const name = count === 1 ? targets[0].name : `${count} archives`;
		const paths = targets.map((t) => t.path);
		toast.promise(useFileSystemStore.getState().extractEntries(paths), {
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

	const handleSingleClick = React.useCallback(
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

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<div
							className={cn(
								"relative min-h-full outline-none",
								isSelecting ? "select-none" : "",
							)}
							onPointerDown={handlePointerDown}
							onClick={(e) => {
								if (isDragging.current) return;
								if (e.target === e.currentTarget)
									useFileSystemStore.getState().clearSelection();
							}}
						>
							<div className="space-y-5 p-4">
								{folders.length > 0 && (
									<section>
										<SectionLabel label="Folders" />
										<EntryGrid
											items={folders}
											gridRef={gridRef}
											selectedPaths={selectedPaths}
											onEntryDoubleClick={onEntryDoubleClick}
											onSingleClick={handleSingleClick}
											setPropertiesEntry={setPropertiesEntry}
											onRequestDelete={handleRequestDelete}
											setRenamingEntry={setRenamingEntry}
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
											onEntryDoubleClick={onEntryDoubleClick}
											onSingleClick={handleSingleClick}
											setPropertiesEntry={setPropertiesEntry}
											onRequestDelete={handleRequestDelete}
											setRenamingEntry={setRenamingEntry}
										/>
									</section>
								)}
								{entries.length === 0 && (
									<div className="flex flex-col items-center justify-center gap-3 py-24">
										<div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-[var(--muted)]">
											<Folder
												size={22}
												className="text-muted-foreground opacity-40"
											/>
										</div>
										<p className="text-muted-foreground text-xs opacity-60">
											This folder is empty
										</p>
									</div>
								)}
							</div>
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

			<NewFolderDialog
				open={newFolderOpen}
				onClose={() => setNewFolderOpen(false)}
				onCreate={async (name) => {
					useFileSystemStore.getState().createDirectory(name);
					setNewFolderOpen(false);
				}}
			/>
			{renamingEntry && (
				<RenameDialog
					open={!!renamingEntry}
					initialName={renamingEntry.name}
					onClose={() => setRenamingEntry(null)}
					onRename={async (name) => {
						await useFileSystemStore.getState().renameEntry(renamingEntry.path, name);
						setRenamingEntry(null);
					}}
				/>
			)}
			<BulkRenameDialog
				open={bulkRenamingEntries.length > 0}
				entries={bulkRenamingEntries}
				onClose={() => useFileSystemStore.getState().setBulkRenamingEntries([])}
				onRename={async (mappings) => {
					for (const m of mappings)
						await useFileSystemStore.getState().renameEntry(m.from, m.to);
					useFileSystemStore.getState().setBulkRenamingEntries([]);
				}}
			/>
			{propertiesEntry && (
				<PropertiesDialog
					open={!!propertiesEntry}
					entry={propertiesEntry}
					onClose={() => setPropertiesEntry(null)}
				/>
			)}
		</>
	);
}
