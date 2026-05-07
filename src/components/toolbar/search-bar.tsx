import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
	query: string;
	onQueryChange: (q: string) => void;
	mode: "filter" | "deep" | "global";
	onModeChange: (m: "filter" | "deep" | "global") => void;
	isSearching: boolean;
	onClear: () => void;
	onClose: () => void;
	currentPath: string;
}

export function SearchBar({
	query,
	onQueryChange,
	mode,
	onModeChange,
	isSearching,
	onClear,
	onClose,
	currentPath,
}: SearchBarProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const currentFolder =
		currentPath.split("/").filter(Boolean).pop() || "Folder";

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onClear();
			onClose();
		}
	};

	return (
		<div className="fade-in flex h-full min-w-0 flex-1 animate-in items-center gap-2 duration-150">
			{/* Search input */}
			<div className="flex h-full min-w-0 flex-1 items-center gap-2">
				{isSearching ? (
					<div className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				) : (
					<Search size={13} className="shrink-0 text-primary" />
				)}
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={
						mode === "filter"
							? `Search in ${currentFolder}…`
							: mode === "global"
								? "Global search in Home…"
								: "Deep search Subdirectories…"
					}
					className="min-w-0 flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/40"
				/>
			</div>

			{/* Mode toggle tags */}
			<div className="flex shrink-0 items-center gap-1">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onModeChange("filter");
					}}
					className={cn(
						"rounded border px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-tight transition-all",
						mode === "filter"
							? "border-primary/20 bg-primary/10 text-primary"
							: "border-transparent text-muted-foreground/60 hover:text-foreground",
					)}
				>
					Filter
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onModeChange("deep");
					}}
					className={cn(
						"rounded border px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-tight transition-all",
						mode === "deep"
							? "border-purple-500/20 bg-purple-500/10 text-purple-400"
							: "border-transparent text-muted-foreground/60 hover:text-foreground",
					)}
				>
					Deep
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onModeChange("global");
					}}
					className={cn(
						"rounded border px-1.5 py-0.5 font-bold text-[10px] uppercase tracking-tight transition-all",
						mode === "global"
							? "border-amber-500/20 bg-amber-500/10 text-amber-500"
							: "border-transparent text-muted-foreground/60 hover:text-foreground",
					)}
				>
					Global
				</button>
			</div>

			{query && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onClear();
					}}
					className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
				>
					<X size={13} />
				</button>
			)}
		</div>
	);
}
