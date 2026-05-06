import { startDrag } from "@crabnebula/tauri-plugin-drag";
import {
	audioDir,
	desktopDir,
	documentDir,
	downloadDir,
	homeDir,
	pictureDir,
	videoDir,
} from "@tauri-apps/api/path";
import {
	Bookmark,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Ellipsis,
	FileText,
	Home,
	Image,
	Monitor,
	Music,
	Network,
	Search,
	Trash2,
	Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { Button } from "./ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "./ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";

interface PlaceItem {
	label: string;
	icon: React.ReactNode;
	path: string;
}

function SidebarItem({
	item,
	isActive,
	onClick,
	onRemove,
}: {
	item: PlaceItem;
	isActive: boolean;
	onClick: () => void;
	onRemove?: () => void;
}) {
	const { moveEntry } = useFileSystemStore();
	const [isOver, setIsOver] = useState(false);

	const handleMouseEnter = () => {};

	const handleMouseLeave = () => {
		setIsOver(false);
	};

	const handleDragStart = (e: React.DragEvent) => {
		e.preventDefault();
		startDrag({ item: [item.path], icon: "" }).catch(console.error);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setIsOver(true);
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
						className={cn("w-full transition-all duration-150", {
							"text-muted-foreground": !isActive,
							"bg-accent/80 ring-2 ring-primary border-primary/50 scale-[1.02]":
								isOver,
						})}
						onClick={onClick}
						draggable
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragLeave={handleMouseLeave}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
						onDrop={handleDrop}
					>
						{item.icon}
						<span className="text-left truncate flex-1">{item.label}</span>
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

function CollapsibleSection({
	title,
	children,
	defaultOpen = true,
}: {
	title: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
}) {
	return (
		<Collapsible defaultOpen={defaultOpen} className="mb-1 px-1">
			<CollapsibleTrigger className="group w-full flex items-center gap-1 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors">
				<ChevronDown
					size={10}
					className="transition-transform duration-200 ease-out -rotate-90 group-data-panel-open:rotate-0"
				/>
				{title}
			</CollapsibleTrigger>
			<CollapsibleContent>{children}</CollapsibleContent>
		</Collapsible>
	);
}

interface SidebarProps {
	onSearch?: () => void;
}

export function Sidebar({ onSearch }: SidebarProps) {
	const { starred, removeStarred, isSidebarOpen } = useSidebarStore();
	const [places, setPlaces] = useState<PlaceItem[]>([]);
	const {
		currentPath,
		setCurrentPath,
		goBack,
		goForward,
		historyIndex,
		history,
	} = useFileSystemStore();

	useEffect(() => {
		async function loadPaths() {
			const resolve = async (fn: () => Promise<string>, fallback: string) => {
				try {
					return await fn();
				} catch {
					return fallback;
				}
			};

			const home = await resolve(homeDir, "/home");
			const desktop = await resolve(desktopDir, `${home}/Desktop`);
			const downloads = await resolve(downloadDir, `${home}/Downloads`);
			const documents = await resolve(documentDir, `${home}/Documents`);
			const pictures = await resolve(pictureDir, `${home}/Pictures`);
			const videos = await resolve(videoDir, `${home}/Videos`);
			const music = await resolve(audioDir, `${home}/Music`);

			setPlaces([
				{
					label: "Home",
					icon: <Home size={15} />,
					path: home,
				},
				{
					label: "Desktop",
					icon: <Monitor size={15} />,
					path: desktop,
				},
				{
					label: "Downloads",
					icon: <Download size={15} />,
					path: downloads,
				},
				{
					label: "Documents",
					icon: <FileText size={15} />,
					path: documents,
				},
				{
					label: "Pictures",
					icon: <Image size={15} />,
					path: pictures,
				},
				{
					label: "Videos",
					icon: <Video size={15} />,
					path: videos,
				},
				{
					label: "Music",
					icon: <Music size={15} />,
					path: music,
				},
			]);
		}

		loadPaths();
	}, []);

	const networkItems: PlaceItem[] = [
		{
			label: "Network",
			icon: <Network size={15} />,
			path: "/run/user/1000/gvfs",
		},
	];

	const trashItems: PlaceItem[] = [
		{
			label: "Trash",
			icon: <Trash2 size={15} />,
			path: `${(places[0]?.path ?? "/home").replace(/\/$/, "")}/.local/share/Trash/files`,
		},
	];

	if (!isSidebarOpen) return null;

	return (
		<aside className="w-52 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border py-2 gap-1">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-0.5">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="ghost" size="icon" className="size-7">
									<Ellipsis size={15} />
								</Button>
							}
						/>
						<DropdownMenuContent side="bottom" align="start">
							<DropdownMenuGroup>
								<DropdownMenuLabel>Settings</DropdownMenuLabel>
								<DropdownMenuItem>Profile</DropdownMenuItem>
								<DropdownMenuItem>Billing</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem>Team</DropdownMenuItem>
								<DropdownMenuItem>Subscription</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						variant="ghost"
						className="size-7"
						size="icon"
						onClick={onSearch}
					>
						<Search size={15} />
					</Button>
				</div>
				<div className="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="icon"
						onClick={goBack}
						disabled={historyIndex <= 0}
						className="size-7"
					>
						<ChevronLeft size={15} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={goForward}
						disabled={historyIndex >= history.length - 1}
						className="size-7"
					>
						<ChevronRight size={15} />
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="px-1 space-y-1">
					<CollapsibleSection title="Places">
						{places.map((item) => (
							<SidebarItem
								key={item.path}
								item={item}
								isActive={
									currentPath === item.path ||
									currentPath === item.path.replace(/\/$/, "")
								}
								onClick={() => setCurrentPath(item.path)}
							/>
						))}
					</CollapsibleSection>

					{/* Starred */}
					<CollapsibleSection title="Starred">
						{starred.length === 0 ? (
							<p className="px-4 py-2 text-[11px] text-muted-foreground/50 italic">
								No starred folders
							</p>
						) : (
							starred.map((item) => (
								<SidebarItem
									key={item.path}
									item={{
										label: item.name,
										icon: <Bookmark size={15} />,
										path: item.path,
									}}
									isActive={currentPath === item.path}
									onClick={() => setCurrentPath(item.path)}
									onRemove={() => removeStarred(item.path)}
								/>
							))
						)}
					</CollapsibleSection>

					{/* Network */}
					<CollapsibleSection title="Network" defaultOpen={false}>
						{networkItems.map((item) => (
							<SidebarItem
								key={item.path}
								item={item}
								isActive={currentPath === item.path}
								onClick={() => setCurrentPath(item.path)}
							/>
						))}
					</CollapsibleSection>

					<div className="mt-auto pt-2 border-t border-sidebar-border mx-2">
						{trashItems.map((item) => (
							<SidebarItem
								key={item.path}
								item={item}
								isActive={currentPath === item.path}
								onClick={() => setCurrentPath(item.path)}
							/>
						))}
					</div>
				</div>
			</ScrollArea>
		</aside>
	);
}
