import type { FileEntry } from "@/types/fs";

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "ico", "svg"];
export const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm"];
export const AUDIO_EXTENSIONS = ["mp3", "wav", "flac", "ogg", "aac"];
export const CODE_EXTENSIONS = [
	"js",
	"ts",
	"tsx",
	"jsx",
	"py",
	"rs",
	"go",
	"css",
	"html",
	"json",
	"yaml",
	"toml",
	"sh",
];
export const DOC_EXTENSIONS = ["md", "txt", "doc", "docx", "rtf"];
export const ARCHIVE_EXTENSIONS = ["zip", "tar", "gz", "rar", "7z"];

export type FileType =
	| "folder"
	| "image"
	| "video"
	| "audio"
	| "code"
	| "doc"
	| "archive"
	| "pdf"
	| "file";

export function getExt(name: string) {
	return name.split(".").pop()?.toLowerCase() ?? "";
}

export function getFileType(entry: FileEntry): FileType {
	if (entry.is_dir) return "folder";
	const ext = getExt(entry.name);
	if (IMAGE_EXTENSIONS.includes(ext)) return "image";
	if (VIDEO_EXTENSIONS.includes(ext)) return "video";
	if (AUDIO_EXTENSIONS.includes(ext)) return "audio";
	if (CODE_EXTENSIONS.includes(ext)) return "code";
	if (DOC_EXTENSIONS.includes(ext)) return "doc";
	if (ARCHIVE_EXTENSIONS.includes(ext)) return "archive";
	if (ext === "pdf") return "pdf";
	return "file";
}

export const FILE_TYPE_COLOR: Record<FileType, string> = {
	folder: "var(--primary)",
	image: "var(--chart-2)",
	video: "var(--chart-5)",
	audio: "var(--chart-2)",
	code: "var(--chart-4)",
	doc: "var(--chart-1)",
	archive: "var(--chart-3)",
	pdf: "var(--destructive)",
	file: "var(--muted-foreground)",
};
