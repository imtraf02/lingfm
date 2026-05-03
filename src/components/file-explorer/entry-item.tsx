import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { invoke } from "@tauri-apps/api/core";
import {
	ClipboardPaste,
	Copy,
	FolderOpen,
	Info,
	RefreshCw,
	Scissors,
	Star,
	Trash2,
	Link2,
	Unlink,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
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
import { useSidebarStore } from "@/store/use-sidebar-store";
import type { FileEntry } from "@/types/fs";
import { FileSvgIcon, FolderSvgIcon, ImageThumb } from "./file-icon";
import { getExt, getFileType } from "./utils";

interface EntryItemProps {
	entry: FileEntry;
	isSelected: boolean;
	onSingleClick: (e: React.MouseEvent) => void;
	onDoubleClick: () => void;
	onOpenProperties: () => void;
	onRequestDelete: () => void;
}

export function EntryItem({
	entry,
	isSelected,
	onSingleClick,
	onDoubleClick,
	onOpenProperties,
	onRequestDelete,
}: EntryItemProps) {
	const { addStarred, removeStarred, isStarred } = useSidebarStore();
	const {
		setClipboard,
		refresh,
		pasteClipboard,
		clipboard,
		selectEntry,
		moveEntry,
		selectedPaths,
	} = useFileSystemStore();
	const starred = isStarred(entry.path);
	const [isOver, setIsOver] = useState(false);

	const type = getFileType(entry);
	const ext = getExt(entry.name);
	const isImage = type === "image";

	const handleStar = () => {
		if (starred) {
			removeStarred(entry.path);
			toast.success(`Removed from starred`);
		} else {
			addStarred({ name: entry.name, path: entry.path });
			toast.success(`Starred ${entry.name}`);
		}
	};

	const handleClick = (e: React.MouseEvent) => {
		// Only handle left click for selection/open
		if (e.button !== 0) return;

		if (e.detail === 2) {
			// Double click detected
			onDoubleClick();
			if (!entry.is_dir) {
				toast.info(`Opening file: ${entry.name}`);
			}
		} else if (e.detail === 1) {
			// Single click
			onSingleClick(e);
		}
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		if (e.button === 2) {
			// Right click — ensure the item is selected before context menu appears
			if (!isSelected) {
				selectEntry(entry.path, false);
			}
		}
	};

	// Use the documented tauri-plugin-drag pattern:
	// 1. Mark element as draggable so browser fires dragstart
	// 2. preventDefault() cancels the HTML5 drag (avoids ghost image conflicts)
	// 3. Call startDrag() synchronously — it's pre-imported so there's no async delay
	//    that would miss the GDK pointer state needed to initiate a native X11 drag.
	const handleDragStart = (e: React.DragEvent) => {
		e.preventDefault();
		const paths = selectedPaths.has(entry.path) ? Array.from(selectedPaths) : [entry.path];
		startDrag({ item: paths, icon: "" }).catch((err) =>
			console.error("[lingfm] startDrag failed:", err),
		);
	};

	const handleDragOver = (e: React.DragEvent) => {
		if (entry.is_dir) {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			setIsOver(true);
		}
	};

	const handleDragLeave = () => {
		setIsOver(false);
	};

	const handleDrop = async (e: React.DragEvent) => {
		if (!entry.is_dir) return;
		e.preventDefault();
		setIsOver(false);

		const srcPath = e.dataTransfer.getData("application/lingfm-path");
		if (srcPath && srcPath !== entry.path) {
			const name = srcPath.split(/[\\/]/).pop() || "";
			const destPath = `${entry.path.replace(/[\\/]$/, "")}/${name}`;
			try {
				await moveEntry(srcPath, destPath);
				toast.success(`Moved ${name}`);
			} catch (err) {
				toast.error(`Failed to move: ${err}`);
			}
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<div
						data-path={entry.path}
						onClick={handleClick}
						onPointerDown={handlePointerDown}
						draggable
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						role="button"
						tabIndex={0}
						className={cn(
							"group relative flex flex-col items-center p-2.5 rounded-lg border",
							"cursor-default transition-all duration-100 ease-out select-none text-center outline-none",
							isSelected
								? "bg-accent border-[var(--ring)]"
								: "border-transparent hover:bg-accent hover:border-[var(--border)]",
							isOver &&
								"bg-accent/80 ring-2 ring-primary border-primary/50 scale-[1.02]",
							entry.is_hidden && "opacity-60 hover:opacity-100"
						)}
					>
						{starred && (
							<span
								className="absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full"
								style={{ background: "var(--chart-4)" }}
							/>
						)}

						<div className="mb-2 flex items-center justify-center w-12 h-12 relative">
							{entry.is_dir ? (
								<FolderSvgIcon selected={isSelected} />
							) : isImage ? (
								<ImageThumb entry={entry} selected={isSelected} />
							) : (
								<FileSvgIcon type={type} ext={ext} selected={isSelected} />
							)}
							{entry.is_link && !entry.is_orphan && (
								<div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border">
									<Link2 size={12} className="text-muted-foreground" />
								</div>
							)}
							{entry.is_orphan && (
								<div className="absolute -bottom-1 -right-1 bg-destructive/10 rounded-full p-0.5 shadow-sm border border-destructive/20">
									<Unlink size={12} className="text-destructive" />
								</div>
							)}
						</div>

						<span
							className={cn(
								"text-[11px] leading-snug break-all line-clamp-2 w-full px-1 transition-colors",
								isSelected
									? "text-[var(--accent-foreground)] font-medium"
									: "text-foreground group-hover:text-accent-foreground",
							)}
						>
							{entry.name}
						</span>

						{!entry.is_dir && ext && (
							<span className="mt-1 text-[9px] font-mono text-muted-foreground tracking-wider uppercase opacity-60">
								.{ext}
							</span>
						)}

						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleStar();
							}}
							className={cn(
								"absolute top-1.5 right-1.5 w-5 h-5 rounded-md",
								"flex items-center justify-center",
								"bg-card border border-border",
								"transition-all duration-100 hover:scale-110",
								starred ? "opacity-100" : "opacity-0 group-hover:opacity-100",
							)}
						>
							<Star
								size={10}
								className={cn(
									starred
										? "fill-chart-4 text-chart-4"
										: "text-muted-foreground",
								)}
							/>
						</button>
					</div>
				}
			/>

			<ContextMenuContent className="w-52 bg-[var(--popover)] border border-[var(--border)] shadow-lg rounded-lg p-1">
				{entry.is_dir && (
					<>
						<ContextMenuItem
							onClick={onDoubleClick}
							className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
						>
							<FolderOpen size={13} className="text-muted-foreground" />
							Open
						</ContextMenuItem>
						<ContextMenuSeparator className="bg-border my-1" />
					</>
				)}

				<ContextMenuItem
					onClick={handleStar}
					className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Star
						size={13}
						className={cn(
							starred ? "fill-chart-4 text-chart-4" : "text-muted-foreground",
						)}
					/>
					{starred ? "Remove from Starred" : "Add to Starred"}
				</ContextMenuItem>

				<ContextMenuSeparator className="bg-border my-1" />

				<ContextMenuItem
					onClick={async () => {
						const paths = selectedPaths.has(entry.path) ? Array.from(selectedPaths) : [entry.path];
						const name = paths.length > 1 ? `${paths.length} items` : entry.name;
						setClipboard({ paths, name, op: "copy" });
						try {
							await invoke("copy_files_to_system_clipboard", { paths });
						} catch (err) {
							console.warn("[lingfm] system clipboard copy failed:", err);
							// Fallback: at least put the path as plain text
							navigator.clipboard.writeText(paths.join('\n')).catch(() => {});
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
						const paths = selectedPaths.has(entry.path) ? Array.from(selectedPaths) : [entry.path];
						const name = paths.length > 1 ? `${paths.length} items` : entry.name;
						setClipboard({ paths, name, op: "cut" });
						try {
							await invoke("copy_files_to_system_clipboard", { paths });
						} catch (err) {
							console.warn("[lingfm] system clipboard cut failed:", err);
							navigator.clipboard.writeText(paths.join('\n')).catch(() => {});
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

				{clipboard && (
					<ContextMenuItem
						onClick={pasteClipboard}
						className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
					>
						<ClipboardPaste size={13} className="text-muted-foreground" />
						Paste
						<ContextMenuShortcut className="text-muted-foreground text-[10px]">
							⌘V
						</ContextMenuShortcut>
					</ContextMenuItem>
				)}

				<ContextMenuItem
					onClick={() =>
						navigator.clipboard.writeText(entry.path).catch(console.error)
					}
					className="gap-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Copy size={13} />
					Copy Path
				</ContextMenuItem>

				<ContextMenuSeparator className="bg-border my-1" />

				<ContextMenuItem
					onClick={refresh}
					className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<RefreshCw size={13} className="text-muted-foreground" />
					Refresh
				</ContextMenuItem>

				<ContextMenuItem
					onClick={onOpenProperties}
					className="gap-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Info size={13} className="text-muted-foreground" />
					Properties
				</ContextMenuItem>

				<ContextMenuSeparator className="bg-border my-1" />

				<ContextMenuItem
					variant="destructive"
					onClick={onRequestDelete}
					className="gap-2 text-xs focus:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] hover:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Trash2 size={13} />
					Delete
					<ContextMenuShortcut className="opacity-40 text-[10px]">
						⌫
					</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
