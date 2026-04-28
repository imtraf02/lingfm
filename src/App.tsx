import { homeDir } from "@tauri-apps/api/path";
import { ChevronLeft, ChevronRight, RotateCcw, X, Star, Search } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { FileExplorer } from "@/components/file-explorer/FileExplorer";
import { Titlebar } from "@/components/Titlebar";
import { Sidebar } from "@/components/Sidebar";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useSearch } from "@/hooks/useSearch";

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
		historyIndex,
		history,
		selectedPaths,
	} = useFileSystemStore();

	const { addStarred, removeStarred, isStarred } = useSidebarStore();

	const [searchOpen, setSearchOpen] = useState(false);
	const searchBtnRef = useRef<HTMLButtonElement>(null);

	const { query, setQuery, isSearching, isActive, mode, setMode, results, clear } =
		useSearch(currentPath, entries);

	const currentName = currentPath.split("/").filter(Boolean).pop() ?? currentPath;
	const starred = isStarred(currentPath);

	const toggleStar = () => {
		if (starred) removeStarred(currentPath);
		else addStarred({ name: currentName, path: currentPath });
	};

	const openSearch = () => setSearchOpen(true);
	const closeSearch = () => {
		clear();
		setSearchOpen(false);
	};

	// Ctrl+F to open search
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "f") {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	// Close search when navigating to a new path
	useEffect(() => {
		closeSearch();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPath]);

	useEffect(() => {
		async function init() {
			try {
				const home = await homeDir();
				await setCurrentPath(home ?? "/");
			} catch {
				await setCurrentPath("/");
			}
		}
		init();
	}, [setCurrentPath]);

	const showDeepResults = isActive && mode === "deep";
	const showFilterResults = isActive && mode === "filter";

	return (
		<div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans border shadow-2xl">
			<Titlebar />

			{/* Toolbar */}
			<header className="flex items-center gap-2 px-2 bg-card border-b border-border h-11 shrink-0">
				{/* Nav buttons */}
				<div className="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="icon"
						onClick={goBack}
						disabled={historyIndex <= 0}
						className="h-7 w-7"
					>
						<ChevronLeft size={16} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={goForward}
						disabled={historyIndex >= history.length - 1}
						className="h-7 w-7"
					>
						<ChevronRight size={16} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={refresh}
						className="h-7 w-7"
					>
						<RotateCcw size={14} className={cn(isLoading && "animate-spin")} />
					</Button>
				</div>

				{/* Path bar */}
				<div className="flex-1 flex items-center px-3 py-1 bg-muted rounded-md text-sm truncate select-all h-7 border border-border/50 min-w-0">
					{currentPath}
				</div>

				{/* Search button */}
				<Button
					ref={searchBtnRef}
					variant="ghost"
					size="icon"
					onClick={openSearch}
					className={cn(
						"h-7 w-7 shrink-0",
						searchOpen && "bg-muted text-foreground"
					)}
					title="Search (Ctrl+F)"
				>
					<Search size={15} className={cn(searchOpen ? "text-primary" : "text-muted-foreground")} />
				</Button>

				{/* Star button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleStar}
					className="h-7 w-7 shrink-0"
					title={starred ? "Remove from starred" : "Add to starred"}
				>
					<Star
						size={15}
						className={cn(
							"transition-colors",
							starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
						)}
					/>
				</Button>
			</header>

			{/* Search bar (slides in below toolbar) */}
			{searchOpen && (
				<SearchBar
					query={query}
					onQueryChange={setQuery}
					mode={mode}
					onModeChange={setMode}
					isSearching={isSearching}
					onClear={clear}
					onClose={closeSearch}
				/>
			)}

			{/* Body: sidebar + main */}
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />

				{/* Main content */}
				<main className="flex-1 overflow-hidden bg-background">
					<ScrollArea className="h-full">
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
								onEntryDoubleClick={(entry) => {
									setCurrentPath(entry.path);
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

								{!showFilterResults && results.length === 0 && !isLoading && !error && (
									<div className="flex flex-col items-center justify-center h-64 text-muted-foreground italic">
										<p>No files found in this directory.</p>
									</div>
								)}

								<FileExplorer
									entries={results}
									onEntryDoubleClick={(entry) => setCurrentPath(entry.path)}
								/>
							</>
						)}
					</ScrollArea>
				</main>
			</div>

			{/* Footer */}
			<footer className="px-3 py-1 bg-muted border-t border-border text-[11px] flex justify-between h-6 items-center shrink-0">
				<div className="flex gap-4">
					{isActive ? (
						<>
							<span>{results.length >= 500 ? "500+" : results.length} results</span>
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
