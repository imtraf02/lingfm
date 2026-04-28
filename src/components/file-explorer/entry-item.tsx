import {
	ClipboardPaste,
	Copy,
	FolderOpen,
	Info,
	RefreshCw,
	Scissors,
	Star,
	Trash2,
} from "lucide-react";
import type React from "react";
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
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { useSidebarStore } from "@/store/useSidebarStore";
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
	const { setClipboard, refresh, pasteClipboard, clipboard, selectEntry } =
		useFileSystemStore();
	const starred = isStarred(entry.path);

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
			// Right click selection
			if (!isSelected) {
				selectEntry(entry.path, false);
			}
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<div
						onClick={handleClick}
						onPointerDown={handlePointerDown}
						role="button"
						tabIndex={0}
						className={cn(
							"group relative flex flex-col items-center p-2.5 rounded-[var(--radius)] border",
							"cursor-default transition-all duration-100 ease-out select-none text-center outline-none",
							isSelected
								? "bg-[var(--accent)] border-[var(--ring)]"
								: "border-transparent hover:bg-[var(--accent)] hover:border-[var(--border)]",
						)}
					>
						{starred && (
							<span
								className="absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full"
								style={{ background: "var(--chart-4)" }}
							/>
						)}

						<div className="mb-2 flex items-center justify-center w-12 h-12">
							{entry.is_dir ? (
								<FolderSvgIcon selected={isSelected} />
							) : isImage ? (
								<ImageThumb entry={entry} selected={isSelected} />
							) : (
								<FileSvgIcon type={type} ext={ext} selected={isSelected} />
							)}
						</div>

						<span
							className={cn(
								"text-[11px] leading-snug break-all line-clamp-2 w-full px-1 transition-colors",
								isSelected
									? "text-[var(--accent-foreground)] font-medium"
									: "text-[var(--foreground)] group-hover:text-[var(--accent-foreground)]",
							)}
						>
							{entry.name}
						</span>

						{!entry.is_dir && ext && (
							<span className="mt-1 text-[9px] font-mono text-[var(--muted-foreground)] tracking-wider uppercase opacity-60">
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
									starred ? "fill-chart-4 text-chart-4" : "text-muted-foreground",
								)}
							/>
						</button>
					</div>
				}
			/>

			<ContextMenuContent className="w-52 bg-[var(--popover)] border border-[var(--border)] shadow-lg rounded-[var(--radius)] p-1">
				{entry.is_dir && (
					<>
						<ContextMenuItem
							onClick={onDoubleClick}
							className="gap-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
						>
							<FolderOpen
								size={13}
								className="text-[var(--muted-foreground)]"
							/>
							Open
						</ContextMenuItem>
						<ContextMenuSeparator className="bg-[var(--border)] my-1" />
					</>
				)}

				<ContextMenuItem
					onClick={handleStar}
					className="gap-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Star
						size={13}
						className={cn(
							starred
								? "fill-[var(--chart-4)] text-[var(--chart-4)]"
								: "text-[var(--muted-foreground)]",
						)}
					/>
					{starred ? "Remove from Starred" : "Add to Starred"}
				</ContextMenuItem>

				<ContextMenuSeparator className="bg-[var(--border)] my-1" />

				<ContextMenuItem
					onClick={() => {
						setClipboard({ path: entry.path, name: entry.name, op: "copy" });
						toast.success(`Copied ${entry.name}`);
					}}
					className="gap-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Copy size={13} className="text-[var(--muted-foreground)]" />
					Copy
					<ContextMenuShortcut className="text-[var(--muted-foreground)] text-[10px]">
						⌘C
					</ContextMenuShortcut>
				</ContextMenuItem>

				<ContextMenuItem
					onClick={() => {
						setClipboard({ path: entry.path, name: entry.name, op: "cut" });
						toast.success(`Cut ${entry.name}`);
					}}
					className="gap-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Scissors size={13} className="text-[var(--muted-foreground)]" />
					Cut
					<ContextMenuShortcut className="text-[var(--muted-foreground)] text-[10px]">
						⌘X
					</ContextMenuShortcut>
				</ContextMenuItem>

				{clipboard && (
					<ContextMenuItem
						onClick={pasteClipboard}
						className="gap-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
					>
						<ClipboardPaste
							size={13}
							className="text-[var(--muted-foreground)]"
						/>
						Paste
						<ContextMenuShortcut className="text-[var(--muted-foreground)] text-[10px]">
							⌘V
						</ContextMenuShortcut>
					</ContextMenuItem>
				)}

				<ContextMenuItem
					onClick={() =>
						navigator.clipboard.writeText(entry.path).catch(console.error)
					}
					className="gap-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Copy size={13} />
					Copy Path
				</ContextMenuItem>

				<ContextMenuSeparator className="bg-[var(--border)] my-1" />

				<ContextMenuItem
					onClick={refresh}
					className="gap-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<RefreshCw size={13} className="text-[var(--muted-foreground)]" />
					Refresh
				</ContextMenuItem>

				<ContextMenuItem
					onClick={onOpenProperties}
					className="gap-2 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
				>
					<Info size={13} className="text-[var(--muted-foreground)]" />
					Properties
				</ContextMenuItem>

				<ContextMenuSeparator className="bg-[var(--border)] my-1" />

				<ContextMenuItem
					onClick={onRequestDelete}
					className="gap-2 text-xs text-[var(--destructive)] focus:text-[var(--destructive)] focus:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] hover:bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] rounded-[calc(var(--radius)*0.75)] px-2 py-1.5 cursor-default"
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
