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
		<div className="flex-1 flex items-center gap-2 animate-in fade-in duration-150 h-full min-w-0">
			{/* Search input */}
			<div className="flex-1 flex items-center gap-2 h-full min-w-0">
				{isSearching ? (
					<div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
				) : (
					<Search size={13} className="text-primary shrink-0" />
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
					className="flex-1 bg-transparent text-[12px] font-mono outline-none placeholder:text-muted-foreground/40 min-w-0"
				/>
			</div>

			{/* Mode toggle tags */}
			<div className="flex items-center gap-1 shrink-0">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onModeChange("filter");
					}}
					className={cn(
						"text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight transition-all border",
						mode === "filter"
							? "bg-primary/10 text-primary border-primary/20"
							: "text-muted-foreground/60 border-transparent hover:text-foreground",
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
						"text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight transition-all border",
						mode === "deep"
							? "bg-purple-500/10 text-purple-400 border-purple-500/20"
							: "text-muted-foreground/60 border-transparent hover:text-foreground",
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
						"text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight transition-all border",
						mode === "global"
							? "bg-amber-500/10 text-amber-500 border-amber-500/20"
							: "text-muted-foreground/60 border-transparent hover:text-foreground",
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
					className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
				>
					<X size={13} />
				</button>
			)}
		</div>
	);
}
