import {
	Bookmark,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Ellipsis,
	Network,
	Search,
	Trash2,
} from "lucide-react";
import { useSidebarPaths } from "@/hooks/use-sidebar-paths";
import { useFileSystemStore } from "@/store/use-file-system-store";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { type PlaceItem, SidebarItem } from "./sidebar-item";
import { Button } from "../ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";

interface SidebarProps {
	onSearch?: () => void;
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
			<CollapsibleTrigger className="group flex w-full items-center gap-1 py-1 font-bold text-[10px] text-muted-foreground/60 uppercase tracking-widest transition-colors hover:text-muted-foreground">
				<ChevronDown
					size={10}
					className="-rotate-90 transition-transform duration-200 ease-out group-data-panel-open:rotate-0"
				/>
				{title}
			</CollapsibleTrigger>
			<CollapsibleContent>{children}</CollapsibleContent>
		</Collapsible>
	);
}

export function Sidebar({ onSearch }: SidebarProps) {
	const { starred, removeStarred, isSidebarOpen } = useSidebarStore();
	const places = useSidebarPaths();
	const {
		currentPath,
		setCurrentPath,
		goBack,
		goForward,
		historyIndex,
		history,
	} = useFileSystemStore();

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
		<aside className="flex w-52 shrink-0 flex-col gap-1 border-sidebar-border border-r bg-sidebar py-2">
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
				<div className="space-y-1 px-1">
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

					<CollapsibleSection title="Network" defaultOpen={true}>
						{networkItems.map((item) => (
							<SidebarItem
								key={item.path}
								item={item}
								isActive={currentPath === item.path}
								onClick={() => setCurrentPath(item.path)}
							/>
						))}
					</CollapsibleSection>

					<div className="mx-2 mt-auto border-sidebar-border border-t pt-2">
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
