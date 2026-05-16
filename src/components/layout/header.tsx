import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowUpDown, Minus, Search, Square, Star, X } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { PathBreadcrumbs } from "@/components/toolbar/path-breadcrumbs";
import { PathInput } from "@/components/toolbar/path-input";
import { SearchBar } from "@/components/toolbar/search-bar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import { useSidebarStore } from "@/store/use-sidebar-store";

interface HeaderProps {
	searchOpen: boolean;
	editPathOpen: boolean;
	isWayland: boolean;
	openSearch: (mode: "filter" | "deep" | "global") => void;
	closeSearch: () => void;
	openEditPath: () => void;
	closeEditPath: () => void;
	query: string;
	setQuery: (q: string) => void;
	mode: "filter" | "deep" | "global";
	setMode: (m: "filter" | "deep" | "global") => void;
	isSearching: boolean;
	clearSearch: () => void;
	onSearchEnter?: () => void;
}

const appWindow = getCurrentWindow();

export function Header({
	searchOpen,
	editPathOpen,
	isWayland,
	openSearch,
	closeSearch,
	openEditPath,
	closeEditPath,
	query,
	setQuery,
	mode,
	setMode,
	isSearching,
	clearSearch,
	onSearchEnter,
}: HeaderProps) {
	const currentPath = useFileSystemStore((s) => s.currentPath);
	const setCurrentPath = useFileSystemStore((s) => s.setCurrentPath);
	const sortOptions = useFileSystemStore((s) => s.sortOptions);
	const setSortOptions = useFileSystemStore((s) => s.setSortOptions);
	const { isStarred, addStarred, removeStarred } = useSidebarStore();

	const currentName =
		currentPath.split("/").filter(Boolean).pop() ?? currentPath;
	const starred = isStarred(currentPath);

	const toggleStar = useCallback(() => {
		if (starred) {
			removeStarred(currentPath);
			toast.success(`Removed ${currentName} from starred`);
		} else {
			addStarred({ name: currentName, path: currentPath });
			toast.success(`Added ${currentName} to starred`);
		}
	}, [starred, currentPath, currentName, addStarred, removeStarred]);

	return (
		<header className="flex h-11 shrink-0 items-center gap-2 border-border border-b bg-background px-2">
			<div
				className={cn(
					"flex h-7.5 min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-border/50 bg-muted/40 transition-all duration-150",
					searchOpen || editPathOpen
						? "border-primary/50 bg-muted/60 ring-2 ring-primary/10"
						: "cursor-text hover:border-border",
				)}
				onClick={() => !searchOpen && !editPathOpen && openEditPath()}
			>
				{searchOpen ? (
					<div className="flex h-full min-w-0 flex-1 items-center px-2">
						<SearchBar
							query={query}
							onQueryChange={setQuery}
							mode={mode}
							onModeChange={setMode}
							isSearching={isSearching}
							onClear={clearSearch}
							onClose={closeSearch}
							currentPath={currentPath}
							onEnter={onSearchEnter}
						/>
					</div>
				) : editPathOpen ? (
					<div className="flex h-full min-w-0 flex-1 items-center px-2">
						<PathInput
							initialPath={currentPath}
							onNavigate={setCurrentPath}
							onClose={closeEditPath}
						/>
					</div>
				) : (
					<div className="flex h-full min-w-0 flex-1 items-center">
						<PathBreadcrumbs
							path={currentPath}
							onPathClick={setCurrentPath}
							onFinalClick={openEditPath}
						/>
					</div>
				)}
			</div>

			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon"
							onClick={searchOpen ? closeSearch : () => openSearch("filter")}
							className={cn(
								"size-7 shrink-0 transition-colors",
								searchOpen &&
									"text-primary hover:bg-primary/10 hover:text-primary",
							)}
						>
							<Search size={15} />
						</Button>
					}
				></TooltipTrigger>
				<TooltipContent side="bottom" align="center" sideOffset={0}>
					<Kbd>Ctrl</Kbd>
					<span>+</span>
					<Kbd>F</Kbd>
				</TooltipContent>
			</Tooltip>

			<DropdownMenu>
				<DropdownMenuTrigger className="inline-flex size-7 shrink-0 cursor-default items-center justify-center rounded-lg outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
					<ArrowUpDown
						size={15}
						className="text-muted-foreground hover:text-foreground"
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuCheckboxItem
						checked={sortOptions.by === "natural"}
						onCheckedChange={() => setSortOptions({ by: "natural" })}
					>
						Natural Sort
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={sortOptions.by === "alpha"}
						onCheckedChange={() => setSortOptions({ by: "alpha" })}
					>
						Alphabetical
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={sortOptions.by === "mtime"}
						onCheckedChange={() => setSortOptions({ by: "mtime" })}
					>
						Modification Time
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={sortOptions.by === "btime"}
						onCheckedChange={() => setSortOptions({ by: "btime" })}
					>
						Creation Time
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={sortOptions.by === "size"}
						onCheckedChange={() => setSortOptions({ by: "size" })}
					>
						Size
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={sortOptions.by === "ext"}
						onCheckedChange={() => setSortOptions({ by: "ext" })}
					>
						Extension
					</DropdownMenuCheckboxItem>

					<DropdownMenuSeparator />

					<DropdownMenuCheckboxItem
						checked={sortOptions.reverse}
						onCheckedChange={(c) => setSortOptions({ reverse: c === true })}
					>
						Reverse Order
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={sortOptions.dir_first}
						onCheckedChange={(c) => setSortOptions({ dir_first: c === true })}
					>
						Directories First
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={sortOptions.show_hidden}
						onCheckedChange={(c) => setSortOptions({ show_hidden: c === true })}
					>
						Show Hidden Files
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Button
				variant="ghost"
				size="icon"
				onClick={toggleStar}
				className="size-7 shrink-0"
			>
				<Star
					size={15}
					className={cn(
						"transition-colors",
						starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
					)}
				/>
			</Button>

			{!isWayland && (
				<>
					<Button
						id="titlebar-minimize"
						variant="ghost"
						size="icon"
						onClick={() => appWindow.minimize()}
						className="size-7 shrink-0"
					>
						<Minus className="h-4 w-4" />
					</Button>
					<Button
						id="titlebar-maximize"
						variant="ghost"
						size="icon"
						onClick={() => appWindow.toggleMaximize()}
						className="size-7 shrink-0"
					>
						<Square className="h-3 w-3" />
					</Button>
				</>
			)}

			<Button
				id="titlebar-close"
				variant="ghost"
				size="icon"
				onClick={() => appWindow.close()}
				className="size-7 shrink-0"
			>
				<X className="h-4 w-4" />
			</Button>
		</header>
	);
}
