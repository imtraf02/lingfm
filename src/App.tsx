import { useHotkeys } from "@tanstack/react-hotkeys";
import { homeDir } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openPath } from "@tauri-apps/plugin-opener";
import { Minus, Search, Square, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileExplorer } from "@/components/file-explorer/file-explorer";
import { PathBreadcrumbs } from "@/components/path-breadcrumbs";
import { PathInput } from "@/components/path-input";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-result";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/hooks/useSearch";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { useSidebarStore } from "@/store/useSidebarStore";

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
			callback: () => {
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
		<div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans border shadow-2xl">
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />

				<div className="flex flex-col w-full">
					<header className="flex items-center gap-2 px-2 bg-card border-b border-border h-11 shrink-0">
						{/* Unified Path/Search bar area */}
						<div 
							className={cn(
								"flex-1 min-w-0 h-[30px] flex items-center bg-muted/40 rounded-lg border border-border/50 transition-all duration-150 overflow-hidden",
								(searchOpen || editPathOpen) ? "border-primary/50 ring-2 ring-primary/10 bg-muted/60" : "hover:border-border cursor-text"
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
						<Button
							ref={searchBtnRef}
							variant="ghost"
							size="icon"
							onClick={searchOpen ? closeSearch : openSearch}
							className={cn(
								"size-7 shrink-0 transition-colors",
								searchOpen && "text-primary hover:text-primary hover:bg-primary/10"
							)}
							title="Search (Ctrl+F)"
						>
							<Search size={15} />
						</Button>

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
								<Button
									variant="outline"
									size="sm"
									className="w-fit mt-2"
									onClick={() => setCurrentPath("/")}
								>
									Go to Root (/)
								</Button>
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
										} catch (err) {
											toast.error("Failed to open file");
										}
									}
									closeSearch();
								}}
							/>
						)}

						{/* Normal / filter mode: grid view */}
						{!error && !showDeepResults && (
							<>
								{showFilterResults && results.length === 0 && !isLoading && (
									<div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-1">
										<p className="text-sm">No results for "{query}"</p>
										<p className="text-xs opacity-60">in current folder</p>
									</div>
								)}

								{!showFilterResults &&
									results.length === 0 &&
									!isLoading &&
									!error && (
										<div className="flex flex-col items-center justify-center h-64 text-muted-foreground italic">
											<p>No files found in this directory.</p>
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
											} catch (err) {
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
				<div className="flex items-center gap-2">
					{(isLoading || isSearching) && (
						<span className="animate-pulse text-muted-foreground">
							{isSearching ? "Searching…" : "Loading…"}
						</span>
					)}
					<div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
				</div>
			</footer>
		</div>
	);
}

export default App;
