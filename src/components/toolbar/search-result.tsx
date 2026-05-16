import { useVirtualizer } from "@tanstack/react-virtual";
import { FileIcon, FolderIcon } from "lucide-react";
import { useRef } from "react";
import type { FileEntry } from "@/types/fs";

interface SearchResultsProps {
	results: FileEntry[];
	query: string;
	mode: "filter" | "deep" | "global"; // Updated to include global
	onEntryDoubleClick: (entry: FileEntry) => void;
}

function highlightMatch(text: string, query: string) {
	if (!query) return <span>{text}</span>;
	const idx = text.toLowerCase().indexOf(query.toLowerCase());
	if (idx === -1) return <span>{text}</span>;
	return (
		<>
			{text.slice(0, idx)}
			<mark className="rounded-sm bg-primary/20 px-0.5 text-primary">
				{text.slice(idx, idx + query.length)}
			</mark>
			{text.slice(idx + query.length)}
		</>
	);
}

function formatSize(bytes: number): string {
	if (bytes === 0) return "—";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function getParentPath(path: string): string {
	const parts = path.split("/");
	parts.pop();
	return parts.join("/") || "/";
}

export function SearchResults({
	results,
	query,
	mode,
	onEntryDoubleClick,
}: SearchResultsProps) {
	const parentRef = useRef<HTMLDivElement>(null);

	const rowVirtualizer = useVirtualizer({
		count: results.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 54, // Approx height of each search item
		overscan: 10,
	});

	if (results.length === 0) {
		return (
			<div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
				<p className="text-sm">No results for "{query}"</p>
				<p className="text-xs opacity-60">Try a different search term</p>
			</div>
		);
	}

	if (mode === "filter") return null;

	return (
		<div
			ref={parentRef}
			className="h-full overflow-y-auto scrollbar-thin"
		>
			<div
				className="relative w-full"
				style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
			>
				<p className="px-4 py-2 text-[11px] text-muted-foreground">
					{results.length >= 500 ? "500+ results" : `${results.length} results`}{" "}
					for "{query}"
				</p>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
					const entry = results[virtualRow.index];
					return (
						<div
							key={virtualRow.key}
							onDoubleClick={() => onEntryDoubleClick(entry)}
							className="group absolute top-0 left-0 flex w-full cursor-default select-none items-center gap-3 rounded-lg px-4 py-2 transition-colors hover:bg-accent"
							style={{
								height: "50px",
								transform: `translateY(${virtualRow.start + 30}px)`, // Offset for header text
							}}
						>
							{entry.is_dir ? (
								<FolderIcon
									size={18}
									className="shrink-0 fill-blue-500/15 text-blue-500"
								/>
							) : (
								<FileIcon size={18} className="shrink-0 text-muted-foreground" />
							)}

							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">
									{highlightMatch(entry.name, query)}
								</p>
								<p className="truncate text-[11px] text-muted-foreground">
									{getParentPath(entry.path)}
								</p>
							</div>

							<div className="shrink-0 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
								{entry.is_dir ? "Folder" : formatSize(entry.size ?? 0)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

