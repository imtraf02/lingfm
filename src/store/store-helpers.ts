import { tauriInvoke } from "@/lib/tauri";
import type { RichFileEntry, SortOptions } from "@/types/fs";

export function extractError(err: unknown): string {
	if (typeof err === "string") return err;
	if (err instanceof Error) return err.message;
	try {
		return JSON.stringify(err);
	} catch {
		return "Unknown error";
	}
}

export async function loadDir(
	path: string,
	sort: SortOptions,
): Promise<RichFileEntry[]> {
	return tauriInvoke<RichFileEntry[]>("read_dir_rich", { path, sort });
}

export interface ClipboardEntry {
	paths: string[];
	name: string;
	op: "copy" | "cut";
}

export const DEFAULT_SORT: SortOptions = {
	by: "natural",
	reverse: false,
	dir_first: true,
	sensitive: false,
	show_hidden: false,
};
