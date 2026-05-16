import { invoke } from "@tauri-apps/api/core";
import {
	ClipboardPaste,
	Copy,
	FolderOpen,
	Info,
	ListRestart,
	Package,
	Pencil,
	RefreshCw,
	RotateCcw,
	Scissors,
	Star,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import type { RichFileEntry as FileEntry } from "@/types/fs";

interface EntryContextMenuProps {
	entry: FileEntry;
	starred: boolean;
	isInTrash: boolean;
	hasClipboard: boolean;
	isMultiSelected: boolean;
	isArchive: boolean;
	onDoubleClick: (entry: FileEntry) => void;
	onOpenProperties: (entry: FileEntry) => void;
	onRequestDelete: (entry: FileEntry) => void;
	onRequestRename: (entry: FileEntry) => void;
	handleStar: () => void;
}

export function EntryContextMenu({
	entry,
	starred,
	isInTrash,
	hasClipboard,
	isMultiSelected,
	isArchive,
	onDoubleClick,
	onOpenProperties,
	onRequestDelete,
	onRequestRename,
	handleStar,
}: EntryContextMenuProps) {
	return (
		<ContextMenuContent className="w-52 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-1 shadow-lg">
			{entry.is_dir && (
				<>
					<ContextMenuItem
						onClick={() => onDoubleClick(entry)}
						className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
					>
						<FolderOpen size={13} className="text-muted-foreground" />
						Open
					</ContextMenuItem>
					<ContextMenuSeparator className="my-1 bg-border" />
				</>
			)}

			{!isInTrash && (
				<>
					<ContextMenuItem
						onClick={handleStar}
						className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
					>
						<Star
							size={13}
							className={cn(
								starred ? "fill-chart-4 text-chart-4" : "text-muted-foreground",
							)}
						/>
						{starred ? "Remove from Starred" : "Add to Starred"}
					</ContextMenuItem>

					{(() => {
						const selectedPaths = useFileSystemStore.getState().selectedPaths;
						const isCurrentSelected = selectedPaths.has(entry.path);

						if (isCurrentSelected && selectedPaths.size > 1) {
							const state = useFileSystemStore.getState();
							const selectedArchives = state.entries.filter(
								(e) =>
									selectedPaths.has(e.path) &&
									/\.(zip|rar|7z|tar|gz|xz|bz2|zst)$/i.test(e.name),
							);

							if (selectedArchives.length > 1) {
								return (
									<>
										<ContextMenuItem
											onClick={() =>
												state.extractEntriesToFolder(
													selectedArchives.map((a) => a.path),
												)
											}
											className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
										>
											<Package size={13} className="text-muted-foreground" />
											Extract {selectedArchives.length} Archives Here
										</ContextMenuItem>
										<ContextMenuItem
											onClick={() =>
												state.extractEntriesToDialog(
													selectedArchives.map((a) => a.path),
												)
											}
											className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
										>
											<Package size={13} className="text-muted-foreground" />
											Extract To...
										</ContextMenuItem>
									</>
								);
							}

							if (selectedArchives.length === 1) {
								const archive = selectedArchives[0];
								return (
									<>
										<ContextMenuItem
											onClick={() => state.extractEntries([archive.path])}
											className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
										>
											<Package size={13} className="text-muted-foreground" />
											Extract Here
										</ContextMenuItem>
										<ContextMenuItem
											onClick={() =>
												state.extractEntriesToDialog([archive.path])
											}
											className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
										>
											<Package size={13} className="text-muted-foreground" />
											Extract To...
										</ContextMenuItem>
									</>
								);
							}
							return null;
						}

						if (isArchive) {
							return (
								<>
									<ContextMenuItem
										onClick={() =>
											useFileSystemStore.getState().extractEntries([entry.path])
										}
										className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
									>
										<Package size={13} className="text-muted-foreground" />
										Extract Here
									</ContextMenuItem>
									<ContextMenuItem
										onClick={() =>
											useFileSystemStore
												.getState()
												.extractEntriesToDialog([entry.path])
										}
										className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
									>
										<Package size={13} className="text-muted-foreground" />
										Extract To...
									</ContextMenuItem>
								</>
							);
						}
						return null;
					})()}

					<ContextMenuSeparator className="my-1 bg-border" />
				</>
			)}

			{isInTrash && (
				<>
					<ContextMenuItem
						onClick={async () => {
							try {
								await useFileSystemStore.getState().restoreEntry(entry.path);
								toast.success(`Restored ${entry.name}`);
							} catch (err) {
								toast.error(`Failed to restore ${entry.name}: ${err}`);
							}
						}}
						className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
					>
						<RotateCcw size={13} className="text-muted-foreground" />
						Restore
					</ContextMenuItem>
					<ContextMenuSeparator className="my-1 bg-border" />
				</>
			)}

			{!isInTrash && (
				<>
					<ContextMenuItem
						onClick={async () => {
							const selectedPaths = useFileSystemStore.getState().selectedPaths;
							const paths = selectedPaths.has(entry.path)
								? Array.from(selectedPaths)
								: [entry.path];
							const name =
								paths.length > 1 ? `${paths.length} items` : entry.name;
							useFileSystemStore
								.getState()
								.setClipboard({ paths, name, op: "copy" });
							try {
								await invoke("copy_files_to_system_clipboard", { paths });
							} catch (err) {
								console.warn("[lingfm] system clipboard copy failed:", err);
								navigator.clipboard.writeText(paths.join("\n")).catch(() => { });
							}
							toast.success(`Copied ${name}`);
						}}
						className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
					>
						<Copy size={13} className="text-muted-foreground" />
						Copy
						<ContextMenuShortcut className="text-[10px] text-muted-foreground">
							⌘C
						</ContextMenuShortcut>
					</ContextMenuItem>

					<ContextMenuItem
						onClick={async () => {
							const selectedPaths = useFileSystemStore.getState().selectedPaths;
							const paths = selectedPaths.has(entry.path)
								? Array.from(selectedPaths)
								: [entry.path];
							const name =
								paths.length > 1 ? `${paths.length} items` : entry.name;
							useFileSystemStore
								.getState()
								.setClipboard({ paths, name, op: "cut" });
							try {
								await invoke("copy_files_to_system_clipboard", { paths });
							} catch (err) {
								console.warn("[lingfm] system clipboard cut failed:", err);
								navigator.clipboard.writeText(paths.join("\n")).catch(() => { });
							}
							toast.success(`Cut ${name}`);
						}}
						className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
					>
						<Scissors size={13} className="text-muted-foreground" />
						Cut
						<ContextMenuShortcut className="text-[10px] text-muted-foreground">
							⌘X
						</ContextMenuShortcut>
					</ContextMenuItem>

					{hasClipboard && (
						<ContextMenuItem
							onClick={() => useFileSystemStore.getState().pasteClipboard()}
							className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
						>
							<ClipboardPaste size={13} className="text-muted-foreground" />
							Paste
							<ContextMenuShortcut className="text-[10px] text-muted-foreground">
								⌘V
							</ContextMenuShortcut>
						</ContextMenuItem>
					)}

					<ContextMenuItem
						onClick={() => onRequestRename(entry)}
						onPointerDown={(e) => e.stopPropagation()}
						className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
					>
						<Pencil size={13} className="text-muted-foreground" />
						Rename
						<ContextMenuShortcut className="text-[10px] text-muted-foreground">
							F2
						</ContextMenuShortcut>
					</ContextMenuItem>

					{isMultiSelected && (
						<ContextMenuItem
							onClick={() => {
								const state = useFileSystemStore.getState();
								const targets = state.entries.filter((e) =>
									state.selectedPaths.has(e.path),
								);
								if (targets.length > 0) state.setBulkRenamingEntries(targets);
							}}
							onPointerDown={(e) => e.stopPropagation()}
							className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
						>
							<ListRestart size={13} className="text-muted-foreground" />
							Bulk Rename
						</ContextMenuItem>
					)}
				</>
			)}

			<ContextMenuItem
				onClick={() =>
					navigator.clipboard.writeText(entry.path).catch(console.error)
				}
				className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-muted-foreground text-xs hover:bg-accent hover:text-accent-foreground"
			>
				<Copy size={13} />
				Copy Path
			</ContextMenuItem>

			<ContextMenuSeparator className="my-1 bg-border" />

			<ContextMenuItem
				onClick={() => useFileSystemStore.getState().refresh()}
				className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
			>
				<RefreshCw size={13} className="text-muted-foreground" />
				Refresh
			</ContextMenuItem>

			<ContextMenuItem
				onClick={() => onOpenProperties(entry)}
				className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
			>
				<Info size={13} className="text-muted-foreground" />
				Properties
			</ContextMenuItem>

			<ContextMenuSeparator className="my-1 bg-border" />

			<ContextMenuItem
				variant="destructive"
				onClick={() => onRequestDelete(entry)}
				className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-xs hover:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] focus:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)]"
			>
				<Trash2 size={13} />
				{isInTrash ? "Delete Permanently" : "Delete"}
				<ContextMenuShortcut className="text-[10px] opacity-40">
					{isInTrash ? "⇧⌫" : "⌫"}
				</ContextMenuShortcut>
			</ContextMenuItem>
		</ContextMenuContent>
	);
}
