import { FileEntry } from "@/types/fs";
import { FileIcon, FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
			<mark className="bg-primary/20 text-primary rounded-sm px-0.5">
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
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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
			<div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
				<p className="text-sm">No results for "{query}"</p>
				<p className="text-xs opacity-60">Try a different search term</p>
			</div>
		);
	}

	// For filter mode, keep grid view (handled by FileExplorer)
	// This component is used for deep search list view
	if (mode === "filter") return null;

	return (
		<div className="p-2 flex flex-col gap-0.5">
			<p className="text-[11px] text-muted-foreground px-2 py-1">
				{results.length >= 500 ? "500+ results" : `${results.length} results`} for "
				{query}"
			</p>
			{results.map((entry) => (
				<div
					key={entry.path}
					onDoubleClick={() => {
						if (entry.is_dir) onEntryDoubleClick(entry);
					}}
					className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-default transition-colors group select-none"
				>
					{entry.is_dir ? (
						<FolderIcon
							size={18}
							className="shrink-0 text-blue-500 fill-blue-500/15"
						/>
					) : (
						<FileIcon size={18} className="shrink-0 text-muted-foreground" />
					)}

					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium truncate">
							{highlightMatch(entry.name, query)}
						</p>
						<p className="text-[11px] text-muted-foreground truncate">
							{getParentPath(entry.path)}
						</p>
					</div>

					<div className="text-[11px] text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
						{entry.is_dir ? "Folder" : formatSize(entry.size)}
					</div>
				</div>
			))}
			{results.length >= 500 && (
				<p className="text-[11px] text-muted-foreground/50 text-center py-2 italic">
					Showing first 500 results. Refine your search for more specific results.
				</p>
			)}
		</div>
	);
}
