import { useEffect, useState } from "react";
import {
	homeDir,
	desktopDir,
	downloadDir,
	documentDir,
	pictureDir,
	videoDir,
	audioDir,
} from "@tauri-apps/api/path";
import {
	Home,
	Download,
	Monitor,
	FileText,
	Image,
	Video,
	Music,
	Star,
	Network,
	Trash2,
	ChevronDown,
	ChevronRight,
	Bookmark,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { useSidebarStore } from "@/store/useSidebarStore";

interface PlaceItem {
	label: string;
	icon: React.ReactNode;
	path: string;
}

interface SidebarSection {
	title: string;
	items: PlaceItem[];
	collapsible?: boolean;
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
	const [hovered, setHovered] = useState(false);

	return (
		<div
			className={cn(
				"group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm cursor-default select-none transition-all duration-100",
				isActive
					? "bg-sidebar-primary/15 text-sidebar-primary font-semibold"
					: "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
			)}
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<span
				className={cn(
					"shrink-0 transition-colors",
					isActive ? "text-sidebar-primary" : "text-muted-foreground"
				)}
			>
				{item.icon}
			</span>
			<span className="truncate flex-1">{item.label}</span>
			{onRemove && hovered && (
				<button
					className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity p-0.5 rounded"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					title="Remove from starred"
				>
					<X size={12} />
				</button>
			)}
		</div>
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
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div className="mb-1">
			<button
				className="w-full flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
				onClick={() => setOpen((v) => !v)}
			>
				{open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
				{title}
			</button>
			{open && <div className="space-y-0.5">{children}</div>}
		</div>
	);
}

export function Sidebar() {
	const { currentPath, setCurrentPath } = useFileSystemStore();
	const { starred, removeStarred } = useSidebarStore();
	const [places, setPlaces] = useState<PlaceItem[]>([]);

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

	return (
		<aside className="w-52 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border overflow-y-auto py-2 gap-1">
			{/* Places */}
			<CollapsibleSection title="Places">
				{places.map((item) => (
					<SidebarItem
						key={item.path}
						item={item}
						isActive={currentPath === item.path || currentPath === item.path.replace(/\/$/, "")}
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
