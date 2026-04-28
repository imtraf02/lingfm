import { useRef, useState } from "react";
import { FileEntry } from "@/types/fs";
import {
	FileIcon,
	FolderIcon,
	FolderPlus,
	Star,
	Copy,
	Scissors,
	Clipboard,
	Trash2,
	Info,
	FolderOpen,
	RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PropertiesDialog } from "@/components/PropertiesDialog";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useFileSystemStore } from "@/store/useFileSystemStore";

interface FileExplorerProps {
	entries: FileEntry[];
	onEntryDoubleClick: (entry: FileEntry) => void;
}

// ─── New Folder Dialog ─────────────────────────────────────────────────────────
function NewFolderDialog({
	open,
	onClose,
	onCreate,
}: {
	open: boolean;
	onClose: () => void;
	onCreate: (name: string) => void;
}) {
	const [name, setName] = useState("New Folder");
	const inputRef = useRef<HTMLInputElement>(null);

	const handleOpen = () => {
		setName("New Folder");
		// Select all text when dialog opens
		setTimeout(() => {
			inputRef.current?.select();
		}, 50);
	};

	const handleCreate = () => {
		if (name.trim()) {
			onCreate(name.trim());
			onClose();
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (v) handleOpen();
				else onClose();
			}}
		>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FolderPlus size={18} className="text-blue-500" />
						New Folder
					</DialogTitle>
				</DialogHeader>

				<Input
					ref={inputRef}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleCreate();
						if (e.key === "Escape") onClose();
					}}
					placeholder="Folder name"
					className="mt-1"
					autoFocus
				/>

				<DialogFooter className="mt-2">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!name.trim()}>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Entry Item ────────────────────────────────────────────────────────────────
function EntryItem({
	entry,
	isSelected,
	onSingleClick,
	onDoubleClick,
	onOpenProperties,
	onRequestDelete,
}: {
	entry: FileEntry;
	isSelected: boolean;
	onSingleClick: (e: React.MouseEvent) => void;
	onDoubleClick: () => void;
	onOpenProperties: () => void;
	onRequestDelete: () => void;
}) {
	const { addStarred, removeStarred, isStarred } = useSidebarStore();
	const { setClipboard, refresh, pasteClipboard, clipboard } = useFileSystemStore();
	const starred = isStarred(entry.path);

	const handleStar = () => {
		if (starred) removeStarred(entry.path);
		else addStarred({ name: entry.name, path: entry.path });
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div
					onClick={onSingleClick}
					onDoubleClick={onDoubleClick}
					className={cn(
						"flex flex-col items-center p-2 rounded-lg cursor-default transition-all duration-75 text-center border select-none",
						isSelected
							? "bg-primary/10 border-primary/30 text-foreground"
							: "border-transparent hover:bg-accent hover:text-accent-foreground hover:border-border"
					)}
				>
					<div className="mb-1.5">
						{entry.is_dir ? (
							<FolderIcon
								size={44}
								className={cn(
									"drop-shadow-sm transition-colors",
									isSelected
										? "text-blue-500 fill-blue-500/25"
										: "text-blue-500 fill-blue-500/10"
								)}
							/>
						) : (
							<FileIcon
								size={44}
								className={cn(
									"transition-colors",
									isSelected ? "text-foreground/70" : "text-muted-foreground"
								)}
							/>
						)}
					</div>
					<span className="text-xs break-all line-clamp-2 w-full px-1 leading-tight">
						{entry.name}
					</span>
				</div>
			</ContextMenuTrigger>

			<ContextMenuContent className="w-56">
				{entry.is_dir && (
					<>
						<ContextMenuItem onClick={onDoubleClick} className="gap-2">
							<FolderOpen size={14} className="text-muted-foreground" />
							Open
						</ContextMenuItem>
						<ContextMenuSeparator />
					</>
				)}

				<ContextMenuItem onClick={handleStar} className="gap-2">
					<Star
						size={14}
						className={cn(
							starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
						)}
					/>
					{starred ? "Remove from Starred" : "Add to Starred"}
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem
					onClick={() => setClipboard({ path: entry.path, name: entry.name, op: "copy" })}
					className="gap-2"
				>
					<Copy size={14} className="text-muted-foreground" />
					Copy
					<ContextMenuShortcut>⌘C</ContextMenuShortcut>
				</ContextMenuItem>

				<ContextMenuItem
					onClick={() => setClipboard({ path: entry.path, name: entry.name, op: "cut" })}
					className="gap-2"
				>
					<Scissors size={14} className="text-muted-foreground" />
					Cut
					<ContextMenuShortcut>⌘X</ContextMenuShortcut>
				</ContextMenuItem>

				{clipboard && (
					<ContextMenuItem onClick={pasteClipboard} className="gap-2">
						<Clipboard size={14} className="text-muted-foreground" />
						Paste
						<ContextMenuShortcut>⌘V</ContextMenuShortcut>
					</ContextMenuItem>
				)}

				<ContextMenuItem
					onClick={() => navigator.clipboard.writeText(entry.path).catch(console.error)}
					className="gap-2 text-muted-foreground"
				>
					<Copy size={14} />
					Copy Path
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem onClick={refresh} className="gap-2">
					<RefreshCw size={14} className="text-muted-foreground" />
					Refresh
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem onClick={onOpenProperties} className="gap-2">
					<Info size={14} className="text-muted-foreground" />
					Properties
				</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem
					onClick={onRequestDelete}
					className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
				>
					<Trash2 size={14} />
					Delete
					<ContextMenuShortcut>Del</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

// ─── FileExplorer ──────────────────────────────────────────────────────────────
export function FileExplorer({ entries, onEntryDoubleClick }: FileExplorerProps) {
	const {
		selectedPaths,
		selectEntry,
		clearSelection,
		deleteEntries,
		clipboard,
		pasteClipboard,
		createDirectory,
		refresh,
	} = useFileSystemStore();

	const [propertiesEntry, setPropertiesEntry] = useState<FileEntry | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
	const [newFolderOpen, setNewFolderOpen] = useState(false);

	const handleBackgroundClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) clearSelection();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if ((e.key === "Delete" || e.key === "Backspace") && selectedPaths.size > 0) {
			const paths = Array.from(selectedPaths);
			const first = entries.find((en) => paths.includes(en.path));
			if (first) setDeleteTarget(first);
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard) {
			pasteClipboard();
		}
	};

	return (
		<>
			{/* Background context menu (right-click on empty area) */}
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-1 p-4 min-h-full outline-none"
						onClick={handleBackgroundClick}
						onKeyDown={handleKeyDown}
						tabIndex={0}
					>
						{entries.map((entry) => (
							<EntryItem
								key={entry.path}
								entry={entry}
								isSelected={selectedPaths.has(entry.path)}
								onSingleClick={(e) => selectEntry(entry.path, e.ctrlKey || e.metaKey)}
								onDoubleClick={() => {
									if (entry.is_dir) onEntryDoubleClick(entry);
								}}
								onOpenProperties={() => setPropertiesEntry(entry)}
								onRequestDelete={() => setDeleteTarget(entry)}
							/>
						))}
					</div>
				</ContextMenuTrigger>

				<ContextMenuContent className="w-52">
					<ContextMenuItem
						onClick={() => setNewFolderOpen(true)}
						className="gap-2"
					>
						<FolderPlus size={14} className="text-muted-foreground" />
						New Folder
						<ContextMenuShortcut>⌘⇧N</ContextMenuShortcut>
					</ContextMenuItem>

					<ContextMenuSeparator />

					<ContextMenuItem
						onClick={pasteClipboard}
						disabled={!clipboard}
						className={cn("gap-2", !clipboard && "opacity-40")}
					>
						<Clipboard size={14} className="text-muted-foreground" />
						Paste
						{clipboard && (
							<span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[80px]">
								{clipboard.name}
							</span>
						)}
						<ContextMenuShortcut>⌘V</ContextMenuShortcut>
					</ContextMenuItem>

					<ContextMenuSeparator />

					<ContextMenuItem onClick={refresh} className="gap-2">
						<RefreshCw size={14} className="text-muted-foreground" />
						Refresh
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			{/* New Folder Dialog */}
			<NewFolderDialog
				open={newFolderOpen}
				onClose={() => setNewFolderOpen(false)}
				onCreate={(name) => createDirectory(name)}
			/>

			{/* Properties Dialog */}
			<PropertiesDialog
				entry={propertiesEntry}
				open={!!propertiesEntry}
				onClose={() => setPropertiesEntry(null)}
			/>

			{/* Delete Confirm */}
			<AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteTarget?.is_dir
								? "This will permanently delete the folder and all its contents. This action cannot be undone."
								: "This will permanently delete the file. This action cannot be undone."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (deleteTarget) {
									deleteEntries([deleteTarget.path]);
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
