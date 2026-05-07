import { useHotkeys } from "@tanstack/react-hotkeys";
import { homeDir } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileExplorer } from "@/components/file-explorer/file-explorer";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SearchResults } from "@/components/toolbar/search-result";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { useSearch } from "@/hooks/use-search";
import { tauriInvoke } from "@/lib/tauri";
import { useFileSystemStore } from "@/store/use-file-system-store";
import { useSidebarStore } from "@/store/use-sidebar-store";

function App() {
	const currentPath = useFileSystemStore((s) => s.currentPath);
	const entries = useFileSystemStore((s) => s.entries);
	const isLoading = useFileSystemStore((s) => s.isLoading);
	const error = useFileSystemStore((s) => s.error);
	const setCurrentPath = useFileSystemStore((s) => s.setCurrentPath);
	const goBack = useFileSystemStore((s) => s.goBack);
	const goForward = useFileSystemStore((s) => s.goForward);
	const refresh = useFileSystemStore((s) => s.refresh);
	const selectedPaths = useFileSystemStore((s) => s.selectedPaths);
	const selectEntry = useFileSystemStore((s) => s.selectEntry);
	const setHomePath = useFileSystemStore((s) => s.setHomePath);
	const initWatcher = useFileSystemStore((s) => s.initWatcher);

	const { toggleSidebar } = useSidebarStore();

	const [searchOpen, setSearchOpen] = useState(false);
	const [editPathOpen, setEditPathOpen] = useState(false);
	const [isWayland, setIsWayland] = useState(false);

	const {
		query,
		setQuery,
		isSearching,
		isActive,
		mode,
		setMode,
		results,
		clear,
	} = useSearch(currentPath, entries, useFileSystemStore.getState().homePath);

	const openSearch = useCallback(
		(initialMode: "filter" | "deep" | "global" = "filter") => {
			setEditPathOpen(false);
			setSearchOpen(true);
			setMode(initialMode);
		},
		[setMode],
	);

	const closeSearch = useCallback(() => {
		clear();
		setSearchOpen(false);
	}, [clear]);

	const openEditPath = useCallback(() => {
		setSearchOpen(false);
		setEditPathOpen(true);
	}, []);

	const closeEditPath = useCallback(() => setEditPathOpen(false), []);

	const handleRefresh = async () => {
		try {
			await refresh();
			toast.success("Directory refreshed");
		} catch (_err) {
			toast.error("Failed to refresh directory");
		}
	};

	useHotkeys([
		{
			hotkey: "Mod+F",
			callback: (e) => {
				e.preventDefault();
				if (searchOpen) closeSearch();
				else openSearch("filter");
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
			options: { enabled: searchOpen || editPathOpen },
		},
	]);

	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA" ||
				(document.activeElement as HTMLElement)?.isContentEditable
			) {
				return;
			}
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			if (e.key.length === 1 && e.key !== " ") {
				if (!searchOpen && !editPathOpen) {
					e.preventDefault();
					openSearch("filter");
					setQuery(e.key);
				}
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [searchOpen, editPathOpen, openSearch, setQuery]);

	useEffect(() => {
		if (isActive && results.length > 0) {
			const firstPath = results[0].path;
			if (!selectedPaths.has(firstPath)) {
				selectEntry(firstPath, false);
			}
		}
	}, [results, isActive, selectEntry, selectedPaths]);

	useEffect(() => {
		closeSearch();
		closeEditPath();
	}, [closeSearch, closeEditPath]);

	useEffect(() => {
		let cleanup: (() => void) | undefined;
		initWatcher().then((fn) => {
			cleanup = fn;
		});
		return () => {
			if (cleanup) cleanup();
		};
	}, [initWatcher]);

	useDragDrop(currentPath, refresh);

	useEffect(() => {
		async function init() {
			try {
				const isW = await tauriInvoke<boolean>("is_wayland");
				setIsWayland(isW);

				const home = await homeDir();
				if (home) setHomePath(home);

				const args = await tauriInvoke<string[]>("get_cli_args");
				const argPath = args.find(
					(a, i) =>
						i > 0 &&
						(a.startsWith("/") || a.startsWith("./") || a.startsWith("../")),
				);

				if (argPath) await setCurrentPath(argPath);
				else await setCurrentPath(home ?? "/");
			} catch {
				await setCurrentPath("/");
			}
		}
		init();
	}, [setHomePath, setCurrentPath]);

	const showDeepResults = isActive && mode === "deep";
	const showFilterResults = isActive && mode === "filter";

	return (
		<div className="flex h-screen select-none flex-col overflow-hidden border bg-background font-sans text-foreground shadow-2xl">
			<div className="flex flex-1 overflow-hidden">
				<Sidebar onSearch={() => openSearch("global")} />

				<div className="flex w-full flex-col">
					<Header
						searchOpen={searchOpen}
						editPathOpen={editPathOpen}
						isWayland={isWayland}
						openSearch={openSearch}
						closeSearch={closeSearch}
						openEditPath={openEditPath}
						closeEditPath={closeEditPath}
						query={query}
						setQuery={setQuery}
						mode={mode}
						setMode={setMode}
						isSearching={isSearching}
						clearSearch={clear}
					/>

					<main className="flex-1 overflow-hidden bg-background">
						<ScrollArea className="h-full">
							{error && (
								<div className="m-4 flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm">
									<div className="flex items-center gap-2 font-bold">
										<X size={16} />
										Error Accessing Directory
									</div>
									<p className="opacity-90">{error}</p>
									<div className="mt-2 flex gap-2">
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

							{!error && showDeepResults && (
								<SearchResults
									results={results}
									query={query}
									mode={mode}
									onEntryDoubleClick={async (entry) => {
										if (entry.is_dir) setCurrentPath(entry.path);
										else {
											try {
												await openPath(entry.path);
											} catch {
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
										<div className="flex h-48 flex-col items-center justify-center gap-1 text-muted-foreground">
											<p className="text-sm">No results for "{query}"</p>
											<p className="text-xs opacity-60">in current folder</p>
										</div>
									)}

									<FileExplorer
										entries={results}
										onEntryDoubleClick={async (entry) => {
											if (entry.is_dir) setCurrentPath(entry.path);
											else {
												try {
													await openPath(entry.path);
												} catch {
													toast.error("Failed to open file");
												}
											}
										}}
									/>
								</>
							)}
						</ScrollArea>
					</main>
				</div>
			</div>

			<Footer
				isActive={isActive}
				query={query}
				isLoading={isLoading}
				isSearching={isSearching}
			/>
		</div>
	);
}

export default App;
