import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { Link2, Star, Unlink } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import { useSidebarStore } from "@/store/use-sidebar-store";
import type { RichFileEntry as FileEntry } from "@/types/fs";
import { EntryContextMenu } from "./entry-context-menu";
import { FileSvgIcon, FolderSvgIcon, ImageThumb } from "./file-icon";
import { getExt, getFileType } from "./utils";

interface EntryItemProps {
	entry: FileEntry;
	isSelected: boolean;
	isMultiSelected: boolean;
	isInTrash: boolean;
	hasClipboard: boolean;
	onSingleClick: (e: React.MouseEvent, entry: FileEntry) => void;
	onDoubleClick: (entry: FileEntry) => void;
	onOpenProperties: (entry: FileEntry) => void;
	onRequestDelete: (entry: FileEntry) => void;
	onRequestRename: (entry: FileEntry) => void;
}

export const EntryItem = memo(function EntryItem({
	entry,
	isSelected,
	isMultiSelected,
	isInTrash,
	hasClipboard,
	onSingleClick,
	onDoubleClick,
	onOpenProperties,
	onRequestDelete,
	onRequestRename,
}: EntryItemProps) {
	// O(1) Set lookup — starredPaths is kept in sync with starred array
	const starred = useSidebarStore((s) => s.starredPaths.has(entry.path));
	const [isOver, setIsOver] = useState(false);

	const type = getFileType(entry);
	const ext = getExt(entry.name);
	const isImage = type === "image";
	const isArchive = /\.(zip|rar|7z|tar|gz|xz|bz2|zst)$/i.test(entry.name);

	const handleStar = () => {
		const state = useSidebarStore.getState();
		if (starred) {
			state.removeStarred(entry.path);
			toast.success(`Removed from starred`);
		} else {
			state.addStarred({ name: entry.name, path: entry.path });
			toast.success(`Starred ${entry.name}`);
		}
	};

	const handleClick = (e: React.MouseEvent) => {
		if (e.button !== 0) return;
		if (e.detail === 2) {
			onDoubleClick(entry);
			if (!entry.is_dir) toast.info(`Opening file: ${entry.name}`);
		} else if (e.detail === 1) {
			onSingleClick(e, entry);
		}
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		if (e.button === 2 && !isSelected) {
			useFileSystemStore.getState().selectEntry(entry.path, false);
		}
	};

	const handleDragStart = (e: React.DragEvent) => {
		e.preventDefault();
		const selectedPaths = useFileSystemStore.getState().selectedPaths;
		const paths = selectedPaths.has(entry.path)
			? Array.from(selectedPaths)
			: [entry.path];
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

	const handleDragLeave = () => setIsOver(false);

	const handleDrop = async (e: React.DragEvent) => {
		if (!entry.is_dir) return;
		e.preventDefault();
		setIsOver(false);

		const srcPath = e.dataTransfer.getData("application/lingfm-path");
		if (srcPath && srcPath !== entry.path) {
			const name = srcPath.split(/[\\/]/).pop() || "";
			const destPath = `${entry.path.replace(/[\\/]$/, "")}/${name}`;
			try {
				await useFileSystemStore.getState().moveEntry(srcPath, destPath);
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
							"group relative flex flex-col items-center rounded-lg border p-2.5",
							"cursor-default select-none text-center outline-none transition-all duration-100 ease-out",
							isSelected
								? "border-[var(--ring)] bg-accent"
								: "border-transparent hover:border-[var(--border)] hover:bg-accent",
							isOver &&
								"scale-[1.02] border-primary/50 bg-accent/80 ring-2 ring-primary",
							entry.is_hidden && "opacity-60 hover:opacity-100",
						)}
					>
						{starred && (
							<span
								className="absolute top-1.5 left-2 h-1.5 w-1.5 rounded-full"
								style={{ background: "var(--chart-4)" }}
							/>
						)}

						<div className="relative mb-2 flex h-12 w-12 items-center justify-center">
							{entry.is_dir ? (
								<FolderSvgIcon selected={isSelected} />
							) : isImage && !isInTrash ? (
								<ImageThumb entry={entry} selected={isSelected} />
							) : (
								<FileSvgIcon type={type} ext={ext} selected={isSelected} />
							)}
							{entry.is_link && !entry.is_orphan && (
								<div className="absolute -right-1 -bottom-1 rounded-full border border-border bg-background p-0.5 shadow-sm">
									<Link2 size={12} className="text-muted-foreground" />
								</div>
							)}
							{entry.is_orphan && (
								<div className="absolute -right-1 -bottom-1 rounded-full border border-destructive/20 bg-destructive/10 p-0.5 shadow-sm">
									<Unlink size={12} className="text-destructive" />
								</div>
							)}
						</div>

						<span
							className={cn(
								"line-clamp-2 w-full break-all px-1 text-[11px] leading-snug transition-colors",
								isSelected
									? "font-medium text-[var(--accent-foreground)]"
									: "text-foreground group-hover:text-accent-foreground",
							)}
						>
							{entry.name}
						</span>

						{!entry.is_dir && ext && (
							<span className="mt-1 font-mono text-[9px] text-muted-foreground uppercase tracking-wider opacity-60">
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
								"absolute top-1.5 right-1.5 h-5 w-5 rounded-md",
								"flex items-center justify-center",
								"border border-border bg-card",
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

			<EntryContextMenu
				entry={entry}
				starred={starred}
				isInTrash={isInTrash}
				hasClipboard={hasClipboard}
				isMultiSelected={isMultiSelected}
				isArchive={isArchive}
				onDoubleClick={onDoubleClick}
				onOpenProperties={onOpenProperties}
				onRequestDelete={onRequestDelete}
				onRequestRename={onRequestRename}
				handleStar={handleStar}
			/>
		</ContextMenu>
	);
});
