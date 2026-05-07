import { FileIcon, FolderIcon } from "lucide-react";
import type { FileEntry } from "@/types/fs";

interface SearchResultsProps {
	results: FileEntry[];
	query: string;
	mode: "filter" | "deep";
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
	if (results.length === 0) {
		return (
			<div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
				<p className="text-sm">No results for "{query}"</p>
				<p className="text-xs opacity-60">Try a different search term</p>
			</div>
		);
	}

	// For filter mode, keep grid view (handled by FileExplorer)
	// This component is used for deep search list view
	if (mode === "filter") return null;

	return (
		<div className="flex flex-col gap-0.5 p-2">
			<p className="px-2 py-1 text-[11px] text-muted-foreground">
				{results.length >= 500 ? "500+ results" : `${results.length} results`}{" "}
				for "{query}"
			</p>
			{results.map((entry) => (
				<div
					key={entry.path}
					onDoubleClick={() => onEntryDoubleClick(entry)}
					className="group flex cursor-default select-none items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
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
						{entry.is_dir ? "Folder" : formatSize(entry.size)}
					</div>
				</div>
			))}
			{results.length >= 500 && (
				<p className="py-2 text-center text-[11px] text-muted-foreground/50 italic">
					Showing first 500 results. Refine your search for more specific
					results.
				</p>
			)}
		</div>
	);
}
