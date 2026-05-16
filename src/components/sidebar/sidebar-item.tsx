import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import { Button } from "../ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "../ui/context-menu";

export interface PlaceItem {
	label: string;
	icon: React.ReactNode;
	path: string;
}

interface SidebarItemProps {
	item: PlaceItem;
	isActive: boolean;
	onClick: () => void;
	onRemove?: () => void;
}

export function SidebarItem({
	item,
	isActive,
	onClick,
	onRemove,
}: SidebarItemProps) {
	const { moveEntry } = useFileSystemStore();
	const [isOver, setIsOver] = useState(false);

	const handleDragStart = (e: React.DragEvent) => {
		e.preventDefault();
		startDrag({ item: [item.path], icon: "" }).catch(console.error);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setIsOver(true);
	};

	const handleMouseLeave = () => {
		setIsOver(false);
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		setIsOver(false);

		const srcPath = e.dataTransfer.getData("application/lingfm-path");
		if (srcPath && srcPath !== item.path) {
			const name = srcPath.split(/[\\/]/).pop() || "";
			const destPath = `${item.path.replace(/[\\/]$/, "")}/${name}`;
			try {
				await moveEntry(srcPath, destPath);
				toast.success(`Moved ${name} to ${item.label}`);
			} catch (err) {
				toast.error(`Failed to move: ${err}`);
			}
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<Button
						variant={isActive ? "default" : "ghost"}
						className={cn("w-full transition-all duration-150 justify-start h-8 px-2.5 focus-visible:ring-inset focus-visible:ring-2", {
							"text-muted-foreground": !isActive,
							"scale-[1.01] border-primary/30 bg-accent/80 ring-2 ring-primary ring-inset":
								isOver,
						})}
						onClick={onClick}
						draggable
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragLeave={handleMouseLeave}
						onMouseLeave={handleMouseLeave}
						onDrop={handleDrop}
					>
						{item.icon}
						<span className="flex-1 truncate text-left">{item.label}</span>
					</Button>
				}
			></ContextMenuTrigger>
			<ContextMenuContent>
				{onRemove && (
					<ContextMenuItem variant="destructive" onClick={onRemove}>
						<Trash2 size={15} />
						Remove
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
