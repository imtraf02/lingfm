import { FileIcon, FolderIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { tauriInvoke } from "@/lib/tauri";
import type { RichFileEntry as FileEntry } from "@/types/fs";

interface EntryProperties {
	name: string;
	path: string;
	is_dir: boolean;
	size: number;
	size_on_disk: number;
	modified: number;
	created: number;
	is_readonly: boolean;
	item_count?: number;
}

interface PropertiesDialogProps {
	entry: FileEntry | null;
	open: boolean;
	onClose: () => void;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]} (${bytes.toLocaleString()} bytes)`;
}

function formatDate(ts: number): string {
	if (!ts) return "Unknown";
	return new Date(ts * 1000).toLocaleString();
}

function formatMode(mode?: number): string {
	if (mode === undefined) return "";
	let out = "";
	out += (mode & 0o400) ? "r" : "-";
	out += (mode & 0o200) ? "w" : "-";
	out += (mode & 0o100) ? "x" : "-";
	out += (mode & 0o040) ? "r" : "-";
	out += (mode & 0o020) ? "w" : "-";
	out += (mode & 0o010) ? "x" : "-";
	out += (mode & 0o004) ? "r" : "-";
	out += (mode & 0o002) ? "w" : "-";
	out += (mode & 0o001) ? "x" : "-";
	return out;
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
				{label}
			</span>
			<span className="text-sm text-foreground break-all">{value}</span>
		</div>
	);
}

export function PropertiesDialog({
	entry,
	open,
	onClose,
}: PropertiesDialogProps) {
	const [props, setProps] = useState<EntryProperties | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!entry || !open) {
			setProps(null);
			setError(null);
			return;
		}
		setLoading(true);
		setError(null);
		tauriInvoke<EntryProperties>("get_entry_properties", { path: entry.path })
			.then((p) => {
				setProps(p);
				setLoading(false);
			})
			.catch((e) => {
				setError(typeof e === "string" ? e : String(e));
				setLoading(false);
			});
	}, [entry, open]);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3">
						{entry?.is_dir ? (
							<FolderIcon
								size={22}
								className="text-blue-500 fill-blue-500/20 shrink-0"
							/>
						) : (
							<FileIcon size={22} className="text-muted-foreground shrink-0" />
						)}
						<span className="truncate">{entry?.name}</span>
					</DialogTitle>
				</DialogHeader>

				<div className="mt-2">
					{loading && (
						<div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
							<Loader2 size={18} className="animate-spin" />
							<span className="text-sm">Loading properties…</span>
						</div>
					)}

					{error && <p className="text-sm text-destructive py-4">{error}</p>}

					{props && !loading && (
						<div className="space-y-4 divide-y divide-border">
							{/* General */}
							<div className="space-y-3 pb-4">
								<Row label="Name" value={props.name} />
								<Row
									label="Type"
									value={
										entry?.is_link
											? "Symlink"
											: props.is_dir
												? "Folder"
												: entry?.extension
													? `.${entry.extension} File`
													: "File"
									}
								/>
								<Row label="Location" value={props.path} />
								{entry?.link_to && <Row label="Target" value={entry.link_to} />}
							</div>

							{/* Size */}
							<div className="space-y-3 py-4">
								{props.is_dir ? (
									<>
										<Row
											label="Contents"
											value={`${props.item_count ?? 0} items`}
										/>
										<Row label="Size" value={formatBytes(props.size_on_disk)} />
									</>
								) : (
									<Row label="Size" value={formatBytes(props.size_on_disk)} />
								)}
							</div>

							{/* Dates */}
							<div className="space-y-3 py-4">
								<Row label="Modified" value={formatDate(props.modified)} />
								<Row label="Created" value={formatDate(props.created)} />
							</div>

							{/* Permissions */}
							<div className="space-y-3 pt-4">
								<Row
									label="Permissions"
									value={
										entry?.mode !== undefined
											? `${props.is_readonly ? "Read only" : "Read & Write"} (${formatMode(entry.mode)})`
											: props.is_readonly ? "Read only" : "Read & Write"
									}
								/>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
