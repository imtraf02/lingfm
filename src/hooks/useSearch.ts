import { Fzf } from "fzf";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tauriInvoke } from "@/lib/tauri";
import type { FileEntry } from "@/types/fs";

type SearchMode = "filter" | "deep";

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
): UseSearchResult {
	const [query, setQueryRaw] = useState("");
	const [mode, setMode] = useState<SearchMode>("filter");
	const [deepResults, setDeepResults] = useState<FileEntry[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortRef = useRef(false);

	const isActive = query.trim().length > 0;

	// Fuzzy finder for local entries
	const fzf = useMemo(() => {
		return new Fzf(localEntries, {
			selector: (item) => item.name,
			tiebreakers: [
				(a, b) => {
					// Prioritize folders over files if scores are tied
					if (a.item.is_dir && !b.item.is_dir) return -1;
					if (!a.item.is_dir && b.item.is_dir) return 1;
					return 0;
				},
			],
		});
	}, [localEntries]);

	// Deep search via Rust backend (debounced)
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

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (!query.trim()) {
			setDeepResults([]);
			setIsSearching(false);
			return;
		}

		if (mode === "deep") {
			setIsSearching(true);
			debounceRef.current = setTimeout(() => {
				runDeepSearch(query, currentPath);
			}, 400);
		} else {
			setIsSearching(false);
			setDeepResults([]);
		}

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, mode, currentPath, runDeepSearch]);

	// Reset deep results when path changes
	useEffect(() => {
		abortRef.current = true;
		setDeepResults([]);
		setIsSearching(false);
	}, [currentPath]);

	const setQuery = (q: string) => {
		setQueryRaw(q);
	};

	const clear = () => {
		abortRef.current = true;
		setQueryRaw("");
		setDeepResults([]);
		setIsSearching(false);
	};

	// Compute results
	const results = useMemo(() => {
		if (!isActive) return localEntries;

		if (mode === "filter") {
			return fzf.find(query).map((res) => res.item);
		}

		// For deep search, we still do fuzzy on the results returned from backend
		// but since deep search backend usually already filters, we just sort them
		const deepFzf = new Fzf(deepResults, {
			selector: (item) => item.name,
		});
		return deepFzf.find(query).map((res) => res.item);
	}, [isActive, mode, localEntries, fzf, query, deepResults]);

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

