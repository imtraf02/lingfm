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
	Trash,
	Trash2,
	Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { Button } from "./ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
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
	const { setCurrentPath } = useFileSystemStore();
	const handlePointerDown = (e: React.PointerEvent) => {
		if (e.button === 2) {
			// Right click also navigates/selects in sidebar usually
			onClick();
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<Button
						variant={isActive ? "default" : "ghost"}
						className={cn("w-full", { "text-muted-foreground": !isActive })}
						onClick={onClick}
						onPointerDown={handlePointerDown}
					>
						{item.icon}
						<span className="text-left truncate flex-1">{item.label}</span>
					</Button>
				}
			></ContextMenuTrigger>
			<ContextMenuContent>
				{onRemove && (
					<ContextMenuGroup>
						<ContextMenuItem variant="destructive" onClick={onRemove}>
							<Trash />
							Remove
						</ContextMenuItem>
					</ContextMenuGroup>
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

export function Sidebar() {
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
		<aside className="w-52 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border overflow-y-auto py-2 gap-1">
			<div className="flex items-center justify-between px-1">
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
								<DropdownMenuLabel>My Account</DropdownMenuLabel>
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

			{/* Trash */}
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
		</aside>
	);
}
