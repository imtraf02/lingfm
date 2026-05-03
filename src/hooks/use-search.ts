import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tauriInvoke } from "@/lib/tauri";
import type { RichFileEntry as FileEntry } from "@/types/fs";

type SearchMode = "filter" | "deep" | "global";

interface UseSearchResult {
	query: string;
	setQuery: (q: string) => void;
	isSearching: boolean;
	isActive: boolean;
	mode: SearchMode;
	setMode: (m: SearchMode) => void;
	results: FileEntry[];
	clear: () => void;
}

export function useSearch(
	currentPath: string,
	localEntries: FileEntry[],
	homePath: string,
): UseSearchResult {
	const [query, setQueryRaw] = useState("");
	const [mode, setMode] = useState<SearchMode>("filter");
	const [deepResults, setDeepResults] = useState<FileEntry[]>([]);
	const [filterResults, setFilterResults] = useState<FileEntry[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef(false);

	const isActive = query.trim().length > 0;

	// Deep/Global search via Rust backend (debounced)
	const runDeepSearch = useCallback(async (q: string, root: string) => {
		if (!q.trim()) return;
		abortRef.current = false;
		setIsSearching(true);
		try {
			const res = await tauriInvoke<FileEntry[]>("search_entries", {
				root,
				query: q.trim(),
			});
			if (!abortRef.current) {
				setDeepResults(res);
			}
		} catch (e) {
			console.error("Search error:", e);
		} finally {
			if (!abortRef.current) setIsSearching(false);
		}
	}, []);

	// Filter search via Rust fzf
	const runFilterSearch = useCallback(async (q: string, entries: FileEntry[]) => {
		if (!q.trim()) return;
		abortRef.current = false;
		try {
			const paths = entries.map((e) => e.path);
			const matchedPaths = await tauriInvoke<string[]>("fzf_filter", {
				paths,
				query: q.trim(),
			});
			
			if (!abortRef.current) {
				// Reconstruct results based on fzf order, preserving folders first
				const matched = matchedPaths
					.map((p) => entries.find((e) => e.path === p))
					.filter(Boolean) as FileEntry[];
					
				// Prioritize folders over files manually to match old behavior
				const folders = matched.filter((e) => e.is_dir);
				const files = matched.filter((e) => !e.is_dir);
				setFilterResults([...folders, ...files]);
			}
		} catch (e) {
			console.error("Fzf filter error:", e);
		}
	}, []);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (!query.trim()) {
			setDeepResults([]);
			setFilterResults([]);
			setIsSearching(false);
			return;
		}

		if (mode === "deep" || mode === "global") {
			setIsSearching(true);
			debounceRef.current = setTimeout(() => {
				const searchRoot = mode === "global" ? homePath : currentPath;
				runDeepSearch(query, searchRoot);
			}, 400);
		} else {
			setIsSearching(false);
			debounceRef.current = setTimeout(() => {
				runFilterSearch(query, localEntries);
			}, 100);
		}

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, mode, currentPath, localEntries, homePath, runDeepSearch, runFilterSearch]);

	// Reset deep results when path changes (except in global mode)
	useEffect(() => {
		if (mode !== "global") {
			abortRef.current = true;
			setDeepResults([]);
			setFilterResults([]);
			setIsSearching(false);
		}
	}, [currentPath, mode]);

	const setQuery = (q: string) => {
		setQueryRaw(q);
	};

	const clear = () => {
		abortRef.current = true;
		setQueryRaw("");
		setDeepResults([]);
		setFilterResults([]);
		setIsSearching(false);
	};

	// Compute results
	const results = useMemo(() => {
		if (!isActive) return localEntries;

		if (mode === "filter") {
			return filterResults;
		}

		return deepResults;
	}, [isActive, mode, localEntries, filterResults, deepResults]);

	return {
		query,
		setQuery,
		isSearching,
		isActive,
		mode,
		setMode,
		results,
		clear,
	};
}

