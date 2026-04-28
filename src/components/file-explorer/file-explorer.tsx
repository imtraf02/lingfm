import { useHotkeys } from "@tanstack/react-hotkeys";
import { Folder, FolderPlus, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PropertiesDialog } from "@/components/properties-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import type { FileEntry } from "@/types/fs";
import { EntryItem } from "./entry-item";
import { NewFolderDialog } from "./new-folder-dialog";

interface FileExplorerProps {
	entries: FileEntry[];
	onEntryDoubleClick: (entry: FileEntry) => void;
}

export function FileExplorer({
	entries,
	onEntryDoubleClick,
}: FileExplorerProps) {
	const {
		selectedPaths,
		selectEntry,
		clearSelection,
		deleteEntries,
		clipboard,
		pasteClipboard,
		createDirectory,
		refresh,
		setClipboard,
	} = useFileSystemStore();

	const [propertiesEntry, setPropertiesEntry] = useState<FileEntry | null>(
		null,
	);
	const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
	const [newFolderOpen, setNewFolderOpen] = useState(false);
	const gridRef = useRef<HTMLDivElement>(null);

	const folders = entries.filter((e) => e.is_dir);
	const files = entries.filter((e) => !e.is_dir);
	const lastSelectedIndex = entries.findIndex((e) => selectedPaths.has(e.path));

	const getGridColumns = () => {
		if (!gridRef.current) return 1;
		return window
			.getComputedStyle(gridRef.current)
			.gridTemplateColumns.split(" ").length;
	};

	const handlePaste = async () => {
		if (!clipboard) return;
		const { name } = clipboard;
		try {
			await pasteClipboard();
			toast.success(`Pasted ${name}`);
		} catch {
			toast.error(`Failed to paste ${name}`);
		}
	};

	const handleDelete = async (paths: string[]) => {
		try {
			await deleteEntries(paths);
			toast.success(
				`Deleted ${paths.length} item${paths.length > 1 ? "s" : ""}`,
			);
		} catch {
			toast.error("Failed to delete");
		}
	};

	const handleCreateDirectory = async (name: string) => {
		try {
			await createDirectory(name);
			toast.success(`Created "${name}"`);
		} catch {
			toast.error(`Failed to create "${name}"`);
		}
	};

	useHotkeys([
		{
			hotkey: "Mod+C",
			callback: () => {
				const entry = entries.find((e) => selectedPaths.has(e.path));
				if (entry) {
					setClipboard({ path: entry.path, name: entry.name, op: "copy" });
					toast.success(`Copied ${entry.name}`);
				}
			},
			options: { enabled: selectedPaths.size > 0 },
		},
		{
			hotkey: "Mod+X",
			callback: () => {
				const entry = entries.find((e) => selectedPaths.has(e.path));
				if (entry) {
					setClipboard({ path: entry.path, name: entry.name, op: "cut" });
					toast.success(`Cut ${entry.name}`);
				}
			},
			options: { enabled: selectedPaths.size > 0 },
		},
		{
			hotkey: "Mod+V",
			callback: handlePaste,
			options: { enabled: !!clipboard },
		},
		{ hotkey: "Mod+Shift+N", callback: () => setNewFolderOpen(true) },
		{
			hotkey: "Delete",
			callback: () => {
				const first = entries.find((e) => selectedPaths.has(e.path));
				if (first) setDeleteTarget(first);
			},
			options: { enabled: selectedPaths.size > 0 },
		},
		{
			hotkey: "Alt+Enter",
			callback: () => {
				const entry = entries.find((e) => selectedPaths.has(e.path));
				if (entry) setPropertiesEntry(entry);
			},
			options: { enabled: selectedPaths.size > 0 },
		},
		{
			hotkey: "Enter",
			callback: () => {
				const entry = entries.find((e) => selectedPaths.has(e.path));
				if (entry) onEntryDoubleClick(entry);
			},
			options: { enabled: selectedPaths.size > 0 },
		},
		{
			hotkey: "ArrowRight",
			callback: () => {
				const i =
					lastSelectedIndex === -1
						? 0
						: (lastSelectedIndex + 1) % entries.length;
				if (entries[i]) selectEntry(entries[i].path, false);
			},
			options: { enabled: entries.length > 0 },
		},
		{
			hotkey: "ArrowLeft",
			callback: () => {
				const i =
					lastSelectedIndex === -1
						? entries.length - 1
						: (lastSelectedIndex - 1 + entries.length) % entries.length;
				if (entries[i]) selectEntry(entries[i].path, false);
			},
			options: { enabled: entries.length > 0 },
		},
		{
			hotkey: "ArrowDown",
			callback: () => {
				const cols = getGridColumns();
				const i =
					lastSelectedIndex === -1
						? 0
						: (lastSelectedIndex + cols) % entries.length;
				if (entries[i]) selectEntry(entries[i].path, false);
			},
			options: { enabled: entries.length > 0 },
		},
		{
			hotkey: "ArrowUp",
			callback: () => {
				const cols = getGridColumns();
				const i =
					lastSelectedIndex === -1
						? entries.length - 1
						: (lastSelectedIndex - cols + entries.length) % entries.length;
				if (entries[i]) selectEntry(entries[i].path, false);
			},
			options: { enabled: entries.length > 0 },
		},
	]);

	const SectionLabel = ({ label }: { label: string }) => (
		<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.07em] mb-2 mt-0.5 px-0.5 opacity-70">
			{label}
		</p>
	);

	const EntryGrid = ({ items }: { items: FileEntry[] }) => (
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
					onSingleClick={(e) => selectEntry(entry.path, e.ctrlKey || e.metaKey)}
					onDoubleClick={() => onEntryDoubleClick(entry)}
					onOpenProperties={() => setPropertiesEntry(entry)}
					onRequestDelete={() => setDeleteTarget(entry)}
				/>
			))}
		</div>
	);

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<div
							className="min-h-full outline-none"
							onClick={(e) => {
								if (e.target === e.currentTarget) clearSelection();
							}}
						>
							<div className="p-4 space-y-5">
								{folders.length > 0 && (
									<section>
										<SectionLabel label="Folders" />
										<EntryGrid items={folders} />
									</section>
								)}

								{files.length > 0 && (
									<section>
										{folders.length > 0 && <SectionLabel label="Files" />}
										<EntryGrid items={files} />
									</section>
								)}

								{entries.length === 0 && (
									<div className="flex flex-col items-center justify-center py-24 gap-3">
										<div className="w-12 h-12 rounded-[var(--radius)] bg-[var(--muted)] border border-border flex items-center justify-center">
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

				<ContextMenuContent className="w-52 bg-popover border border-border shadow-lg rounded-[var(--radius)] p-1">
					<ContextMenuItem
						onClick={() => setNewFolderOpen(true)}
						className="gap-2 text-xs text-foreground hover:bg-accent hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
					>
						<FolderPlus size={13} className="text-muted-foreground" />
						New Folder
						<ContextMenuShortcut className="text-muted-foreground text-[10px]">
							⌘⇧N
						</ContextMenuShortcut>
					</ContextMenuItem>

					<ContextMenuSeparator className="bg-[var(--border)] my-1" />

					<ContextMenuItem
						onClick={handlePaste}
						disabled={!clipboard}
						className={cn(
							"gap-2 text-xs rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default",
							clipboard
								? "text-foreground hover:bg-accent hover:text-[var(--accent-foreground)]"
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

					<ContextMenuItem
						onClick={refresh}
						className="gap-2 text-xs text-foreground hover:bg-accent hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
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

			<PropertiesDialog
				entry={propertiesEntry}
				open={!!propertiesEntry}
				onClose={() => setPropertiesEntry(null)}
			/>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(v) => !v && setDeleteTarget(null)}
			>
				<AlertDialogContent className="bg-popover border border-border rounded-[calc(var(--radius)*2)] shadow-lg max-w-sm">
					<AlertDialogHeader>
						<div
							className="w-9 h-9 rounded-[var(--radius)] border flex items-center justify-center mb-1"
							style={{
								background:
									"color-mix(in oklch, var(--destructive) 10%, transparent)",
								borderColor:
									"color-mix(in oklch, var(--destructive) 25%, transparent)",
							}}
						>
							<Trash2 size={16} className="text-[var(--destructive)]" />
						</div>
						<AlertDialogTitle className="text-sm font-medium text-foreground">
							Delete "{deleteTarget?.name}"?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
							{deleteTarget?.is_dir
								? "This will permanently delete the folder and all its contents. This action cannot be undone."
								: "This will permanently delete the file. This action cannot be undone."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="gap-2">
						<AlertDialogCancel className="bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-accent rounded-[var(--radius)] text-xs h-8">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							style={{
								background:
									"color-mix(in oklch, var(--destructive) 15%, transparent)",
								color: "var(--destructive)",
								borderColor:
									"color-mix(in oklch, var(--destructive) 30%, transparent)",
							}}
							className="border rounded-[var(--radius)] text-xs h-8 hover:opacity-80"
							onClick={() => {
								if (deleteTarget) {
									handleDelete([deleteTarget.path]);
									setDeleteTarget(null);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
