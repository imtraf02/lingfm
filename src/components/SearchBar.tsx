import { useRef, useEffect } from "react";
import { Search, X, FolderSearch, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
	query: string;
	onQueryChange: (q: string) => void;
	mode: "filter" | "deep";
	onModeChange: (m: "filter" | "deep") => void;
	isSearching: boolean;
	onClear: () => void;
	onClose: () => void;
}

export function SearchBar({
	query,
	onQueryChange,
	mode,
	onModeChange,
	isSearching,
	onClear,
	onClose,
}: SearchBarProps) {
	const inputRef = useRef<HTMLInputElement>(null);

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
		<div className="flex items-center gap-1.5 px-2 py-1.5 bg-card border-b border-border shrink-0 animate-in slide-in-from-top-1 duration-150">
			{/* Mode toggle */}
			<div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5 shrink-0">
				<button
					onClick={() => onModeChange("filter")}
					title="Filter current folder"
					className={cn(
						"flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all",
						mode === "filter"
							? "bg-background shadow-sm text-foreground"
							: "text-muted-foreground hover:text-foreground"
					)}
				>
					<Filter size={11} />
					Current
				</button>
				<button
					onClick={() => onModeChange("deep")}
					title="Search in all subdirectories"
					className={cn(
						"flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all",
						mode === "deep"
							? "bg-background shadow-sm text-foreground"
							: "text-muted-foreground hover:text-foreground"
					)}
				>
					<FolderSearch size={11} />
					Deep
				</button>
			</div>

			{/* Search input */}
			<div className="flex-1 flex items-center gap-2 px-2.5 h-7 bg-muted rounded-md border border-border/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
				{isSearching ? (
					<div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
				) : (
					<Search size={13} className="text-muted-foreground shrink-0" />
				)}
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={
						mode === "filter"
							? "Filter in current folder…"
							: "Search in all subfolders…"
					}
					className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
				/>
				{query && (
					<button
						onClick={onClear}
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<X size={13} />
					</button>
				)}
			</div>

			{/* Close */}
			<Button
				variant="ghost"
				size="icon"
				onClick={() => {
					onClear();
					onClose();
				}}
				className="h-7 w-7 shrink-0 text-muted-foreground"
			>
				<X size={14} />
			</Button>
		</div>
	);
}
