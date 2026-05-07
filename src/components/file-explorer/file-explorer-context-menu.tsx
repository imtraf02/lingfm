import { invoke } from "@tauri-apps/api/core";
import {
	Copy,
	FolderPlus,
	Pencil,
	RefreshCw,
	Scissors,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useFileSystemStore } from "@/store/use-file-system-store";
import type { RichFileEntry as FileEntry } from "@/types/fs";

interface FileExplorerContextMenuProps {
	selectedPaths: Set<string>;
	entries: FileEntry[];
	isInTrash: boolean;
	setNewFolderOpen: (open: boolean) => void;
	setRenamingEntry: (entry: FileEntry | null) => void;
	handleDelete: (targets: FileEntry[]) => void;
}

export function FileExplorerContextMenu({
	selectedPaths,
	entries,
	isInTrash,
	setNewFolderOpen,
	setRenamingEntry,
	handleDelete,
}: FileExplorerContextMenuProps) {
	return (
		<ContextMenuContent className="w-52 rounded-lg border border-border bg-popover p-1 shadow-lg">
			{!isInTrash && (
				<>
					<ContextMenuItem
						onClick={() => setNewFolderOpen(true)}
						className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
					>
						<FolderPlus size={13} className="text-muted-foreground" />
						New Folder
						<ContextMenuShortcut className="text-[10px] text-muted-foreground">
							⌘⇧N
						</ContextMenuShortcut>
					</ContextMenuItem>

					{selectedPaths.size > 0 && (
						<>
							<ContextMenuSeparator className="my-1 bg-border" />
							<ContextMenuItem
								onClick={() => {
									const selected = entries.filter((e) =>
										selectedPaths.has(e.path),
									);
									if (selected.length === 1) {
										setRenamingEntry(selected[0]);
									} else if (selected.length > 1) {
										useFileSystemStore
											.getState()
											.setBulkRenamingEntries(selected);
									}
								}}
								className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
							>
								<Pencil size={13} className="text-muted-foreground" />
								{selectedPaths.size > 1 ? "Bulk Rename" : "Rename"}
								<ContextMenuShortcut className="text-[10px] text-muted-foreground">
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
										await invoke("copy_files_to_system_clipboard", { paths });
									} catch (err) {
										console.warn("[lingfm] Context menu copy failed:", err);
										navigator.clipboard
											.writeText(paths.join("\n"))
											.catch(() => {});
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
										await invoke("copy_files_to_system_clipboard", { paths });
									} catch (err) {
										console.warn("[lingfm] Context menu cut failed:", err);
										navigator.clipboard
											.writeText(paths.join("\n"))
											.catch(() => {});
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

							<ContextMenuSeparator className="my-1 bg-border" />

							<ContextMenuItem
								variant="destructive"
								onClick={() => {
									const targets = entries.filter((e) =>
										selectedPaths.has(e.path),
									);
									handleDelete(targets);
								}}
								className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-xs hover:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)]"
							>
								<Trash2 size={13} />
								Delete
								<ContextMenuShortcut className="text-[10px] opacity-40">
									⌫
								</ContextMenuShortcut>
							</ContextMenuItem>
						</>
					)}
				</>
			)}

			{isInTrash && selectedPaths.size > 0 && (
				<ContextMenuItem
					variant="destructive"
					onClick={() => {
						const targets = entries.filter((e) => selectedPaths.has(e.path));
						handleDelete(targets);
					}}
					className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-xs hover:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)]"
				>
					<Trash2 size={13} />
					Delete Permanently
					<ContextMenuShortcut className="text-[10px] opacity-40">
						⇧⌫
					</ContextMenuShortcut>
				</ContextMenuItem>
			)}

			<ContextMenuSeparator className="my-1 bg-border" />
			<ContextMenuItem
				onClick={() => useFileSystemStore.getState().refresh()}
				className="cursor-default gap-2 rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 text-foreground text-xs hover:bg-accent hover:text-accent-foreground"
			>
				<RefreshCw size={13} className="text-muted-foreground" />
				Refresh
			</ContextMenuItem>
		</ContextMenuContent>
	);
}
