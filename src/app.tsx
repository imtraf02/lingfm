import { useHotkeys } from "@tanstack/react-hotkeys";
import { homeDir } from "@tauri-apps/api/path";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openPath } from "@tauri-apps/plugin-opener";
import { ArrowUpDown, Minus, Search, Square, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileExplorer } from "@/components/file-explorer/file-explorer";
import { PathBreadcrumbs } from "@/components/path-breadcrumbs";
import { PathInput } from "@/components/path-input";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-result";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/hooks/use-search";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/use-file-system-store";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { Kbd } from "./components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "./components/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

const appWindow = getCurrentWindow();

function App() {
	const {
		currentPath,
		entries,
		isLoading,
		error,
		setCurrentPath,
		goBack,
		goForward,
		refresh,
		selectedPaths,
		selectEntry,
		setHomePath,
		moveEntry,
		initWatcher,
		activeTasks,
		sortOptions,
		setSortOptions,
	} = useFileSystemStore();

	const { addStarred, removeStarred, isStarred, toggleSidebar } =
		useSidebarStore();

	const [searchOpen, setSearchOpen] = useState(false);
	const [editPathOpen, setEditPathOpen] = useState(false);
	const searchBtnRef = useRef<HTMLButtonElement>(null);

	const {
		query,
		setQuery,
		isSearching,
		isActive,
		mode,
		setMode,
		results,
		clear,
	} = useSearch(currentPath, entries);

	const currentName =
		currentPath.split("/").filter(Boolean).pop() ?? currentPath;
	const starred = isStarred(currentPath);

	const toggleStar = () => {
		if (starred) {
			removeStarred(currentPath);
			toast.success(`Removed ${currentName} from starred`);
		} else {
			addStarred({ name: currentName, path: currentPath });
			toast.success(`Added ${currentName} to starred`);
		}
	};

	const openSearch = () => {
		setEditPathOpen(false);
		setSearchOpen(true);
	};
	const closeSearch = () => {
		clear();
		setSearchOpen(false);
	};

	const openEditPath = () => {
		setSearchOpen(false);
		setEditPathOpen(true);
	};
	const closeEditPath = () => setEditPathOpen(false);

	const handleRefresh = async () => {
		try {
			await refresh();
			toast.success("Directory refreshed");
		} catch (err) {
			toast.error("Failed to refresh directory");
		}
	};

	useHotkeys([
		{
			hotkey: "Mod+F",
			callback: (e) => {
				e.preventDefault();
				if (searchOpen) {
					closeSearch();
				} else {
					openSearch();
				}
			},
		},
		{
			hotkey: "Mod+L",
			callback: () => openEditPath(),
		},
		{
			hotkey: "Mod+B",
			callback: () => toggleSidebar(),
		},
		{
			hotkey: "Mod+R",
			callback: () => handleRefresh(),
		},
		{
			hotkey: "F5",
			callback: () => handleRefresh(),
		},
		{
			hotkey: "Alt+ArrowLeft",
			callback: () => goBack(),
		},
		{
			hotkey: "Alt+ArrowRight",
			callback: () => goForward(),
		},
		{
			hotkey: "Escape",
			callback: () => {
				if (searchOpen) closeSearch();
				if (editPathOpen) closeEditPath();
			},
			options: {
				enabled: searchOpen || editPathOpen,
			},
		},
	]);

	// Type-to-search functionality
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			// Ignore if any input/textarea is already focused
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA" ||
				(document.activeElement as HTMLElement)?.isContentEditable
			) {
				return;
			}

			// Ignore if modifiers are pressed (except Shift)
			if (e.ctrlKey || e.metaKey || e.altKey) return;

			// Handle any single printable character
			if (e.key.length === 1 && e.key !== " ") {
				if (!searchOpen && !editPathOpen) {
					e.preventDefault();
					openSearch();
					setMode("filter");
					setQuery(e.key);
				}
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [searchOpen, editPathOpen, openSearch, setMode, setQuery]);

	// Auto-select first result when searching
	useEffect(() => {
		if (isActive && results.length > 0) {
			const firstPath = results[0].path;
			// Only update if not already selected to avoid infinite loops or unnecessary renders
			if (!selectedPaths.has(firstPath)) {
				selectEntry(firstPath, false);
			}
		}
	}, [results, isActive, selectEntry, selectedPaths]);

	// Close when navigating to a new path
	useEffect(() => {
		closeSearch();
		closeEditPath();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPath]);

	useEffect(() => {
		let cleanup: (() => void) | undefined;
		initWatcher().then((fn) => {
			cleanup = fn;
		});
		return () => {
			if (cleanup) cleanup();
		};
	}, [initWatcher]);

	useEffect(() => {
		let unlisten: (() => void) | undefined;

		async function setup() {
			try {
				const appWindow = getCurrentWebviewWindow();
				unlisten = await appWindow.onDragDropEvent(async (event) => {
					if (event.payload.type === "drop") {
						const { paths } = event.payload;
						let successCount = 0;
						const existingNames = new Set(
							useFileSystemStore.getState().entries.map((e) => e.name),
						);

						for (const srcPath of paths) {
							const originalName = srcPath.split(/[\\/]/).pop() || "unnamed";
							let destName = originalName;

							let counter = 1;
							const extMatch = originalName.lastIndexOf(".");
							const hasExt = extMatch > 0;
							const base = hasExt ? originalName.slice(0, extMatch) : originalName;
							const ext = hasExt ? originalName.slice(extMatch) : "";

							while (existingNames.has(destName)) {
								destName = `${base} (${counter})${ext}`;
								counter++;
							}

							existingNames.add(destName);
							const destPath = `${currentPath.replace(/[\\/]$/, "")}/${destName}`;

							try {
								const { tauriInvoke } = await import("@/lib/tauri");
								await tauriInvoke("copy_entry", { src: srcPath, dest: destPath });
								successCount++;
							} catch (err) {
								toast.error(`Failed to copy ${destName}: ${err}`);
							}
						}

						if (successCount > 0) {
							toast.success(`Imported ${successCount} items`);
							refresh();
						}
					}
				});
			} catch (err) {
				console.error("Failed to setup drag drop listener:", err);
			}
		}

		setup();
		return () => {
			if (unlisten) unlisten();
		};
	}, [currentPath, refresh]);

	useEffect(() => {
		async function init() {
			try {
				const home = await homeDir();
				if (home) setHomePath(home);
				await setCurrentPath(home ?? "/");
			} catch {
				await setCurrentPath("/");
			}
		}
		init();
	}, [setCurrentPath, setHomePath]);

	const showDeepResults = isActive && mode === "deep";
	const showFilterResults = isActive && mode === "filter";

	return (
		<div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans border shadow-2xl select-none">
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />

				<div className="flex flex-col w-full">
					<header className="flex items-center gap-2 px-2 bg-background border-b border-border h-11 shrink-0">
						{/* Unified Path/Search bar area */}
						<div
							className={cn(
								"flex-1 min-w-0 h-7.5 flex items-center bg-muted/40 rounded-lg border border-border/50 transition-all duration-150 overflow-hidden",
								searchOpen || editPathOpen
									? "border-primary/50 ring-2 ring-primary/10 bg-muted/60"
									: "hover:border-border cursor-text",
							)}
							onClick={() => !searchOpen && !editPathOpen && openEditPath()}
						>
							{searchOpen ? (
								<div className="flex-1 min-w-0 px-2 h-full flex items-center">
									<SearchBar
										query={query}
										onQueryChange={setQuery}
										mode={mode}
										onModeChange={setMode}
										isSearching={isSearching}
										onClear={clear}
										onClose={closeSearch}
										currentPath={currentPath}
									/>
								</div>
							) : editPathOpen ? (
								<div className="flex-1 min-w-0 px-2 h-full flex items-center">
									<PathInput
										initialPath={currentPath}
										onNavigate={setCurrentPath}
										onClose={closeEditPath}
									/>
								</div>
							) : (
								<div className="flex-1 min-w-0 h-full flex items-center">
									<PathBreadcrumbs
										path={currentPath}
										onPathClick={setCurrentPath}
										onFinalClick={openEditPath}
									/>
								</div>
							)}
						</div>

						{/* Search toggle button */}
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										ref={searchBtnRef}
										variant="ghost"
										size="icon"
										onClick={searchOpen ? closeSearch : openSearch}
										className={cn(
											"size-7 shrink-0 transition-colors",
											searchOpen &&
											"text-primary hover:text-primary hover:bg-primary/10",
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

						{/* Sort Dropdown */}
						<DropdownMenu>
							<DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg hover:bg-accent hover:text-accent-foreground size-7 shrink-0 cursor-default outline-none transition-colors">
								<ArrowUpDown size={15} className="text-muted-foreground hover:text-foreground" />
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



						{/* Star button */}
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
									starred
										? "fill-amber-400 text-amber-400"
										: "text-muted-foreground",
								)}
							/>
						</Button>
						<Button
							id="titlebar-minimize"
							variant="ghost"
							size="icon"
							onClick={() => appWindow.minimize()}
							className="size-7 shrink-0"
						>
							<Minus className="w-4 h-4" />
						</Button>
						<Button
							id="titlebar-maximize"
							variant="ghost"
							size="icon"
							onClick={() => appWindow.toggleMaximize()}
							className="size-7 shrink-0"
						>
							<Square className="w-3 h-3" />
						</Button>
						<Button
							id="titlebar-close"
							variant="ghost"
							size="icon"
							onClick={() => appWindow.close()}
							className="size-7 shrink-0"
						>
							<X className="w-4 h-4" />
						</Button>
					</header>

					<main className="flex-1 overflow-hidden bg-background">
						{error && (
							<div className="m-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex flex-col gap-2">
								<div className="font-bold flex items-center gap-2">
									<X size={16} />
									Error Accessing Directory
								</div>
								<p className="opacity-90">{error}</p>
								<div className="flex gap-2 mt-2">
									<Button
										variant="outline"
										size="sm"
										className="w-fit"
										onClick={() => setCurrentPath("/")}
									>
										Go to Root (/)
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="w-fit"
										onClick={() => {
											navigator.clipboard.writeText(error);
											toast.success("Copied error to clipboard");
										}}
									>
										Copy Error
									</Button>
								</div>
							</div>
						)}

						{/* Deep search: list view */}
						{!error && showDeepResults && (
							<SearchResults
								results={results}
								query={query}
								mode={mode}
								onEntryDoubleClick={async (entry) => {
									if (entry.is_dir) {
										setCurrentPath(entry.path);
									} else {
										try {
											await openPath(entry.path);
										} catch (_err) {
											toast.error("Failed to open file");
										}
									}
									closeSearch();
								}}
							/>
						)}

						{!showDeepResults && (
							<>
								{showFilterResults && results.length === 0 && !isLoading && (
									<div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-1">
										<p className="text-sm">No results for "{query}"</p>
										<p className="text-xs opacity-60">in current folder</p>
									</div>
								)}

								<FileExplorer
									entries={results}
									onEntryDoubleClick={async (entry) => {
										if (entry.is_dir) {
											setCurrentPath(entry.path);
										} else {
											try {
												await openPath(entry.path);
											} catch (_err) {
												toast.error("Failed to open file");
											}
										}
									}}
								/>
							</>
						)}
					</main>
				</div>
			</div>

			{/* Footer */}
			<footer className="px-3 py-1 bg-muted border-t border-border text-[11px] flex justify-between h-6 items-center shrink-0">
				<div className="flex gap-4">
					{isActive ? (
						<>
							<span>
								{results.length >= 500 ? "500+" : results.length} results
							</span>
							<span className="text-primary font-medium">
								Searching: "{query}"
							</span>
						</>
					) : (
						<>
							<span>{entries.length} items</span>
							<span>{entries.filter((e) => e.is_dir).length} folders</span>
							<span>{entries.filter((e) => !e.is_dir).length} files</span>
						</>
					)}
					{selectedPaths.size > 0 && (
						<span className="text-primary font-semibold">
							{selectedPaths.size} selected
						</span>
					)}
				</div>
				<div className="flex items-center gap-4">
					{Array.from(activeTasks.values()).map((task) => (
						<div
							key={task.id}
							className="flex items-center gap-2 max-w-[200px] text-muted-foreground"
						>
							<span className="truncate capitalize text-[10px]">
								{task.kind} {task.name}
							</span>
							<div className="w-16 h-1 bg-border rounded-full overflow-hidden">
								<div
									className="h-full bg-primary transition-all duration-300 ease-out"
									style={{
										width: `${task.total > 0
												? Math.max(5, (task.done / task.total) * 100)
												: 100
											}%`,
									}}
								/>
							</div>
						</div>
					))}
					<div className="flex items-center gap-2">
						{(isLoading || isSearching) && (
							<span className="animate-pulse text-muted-foreground">
								{isSearching ? "Searching…" : "Loading…"}
							</span>
						)}
						<div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
					</div>
				</div>
			</footer>
		</div>
	);
}

export default App;
