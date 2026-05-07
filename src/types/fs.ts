export interface FileEntry {
	name: string;
	path: string;
	is_dir: boolean;
	size: number;
	modified: number;
	extension?: string;
}

export interface RichFileEntry extends FileEntry {
	is_link: boolean;
	is_hidden: boolean;
	is_orphan: boolean;
	mode: number;
	uid: number;
	gid: number;
	nlink: number;
	atime?: number;
	btime?: number;
	ctime?: number;
	mtime?: number;
	link_to?: string;
}

export interface TaskProgress {
	id: number;
	kind: "copy" | "move" | "delete" | "trash" | "rename" | "extract";
	name: string;
	total: number;
	done: number;
	found: number;
	processed: number;
	failed: number;
}

export interface TaskDone {
	id: number;
	kind: string;
	success: boolean;
	errors: string[];
}

export interface FsEvent {
	path: string;
}

export interface FsRenameEvent {
	old_path: string;
	new_path: string;
}

export interface FileMetadata {
	size: number;
	modified: number;
	created: number;
	is_readonly: boolean;
}

export interface SortOptions {
	by?: "natural" | "alpha" | "mtime" | "btime" | "size" | "ext";
	reverse?: boolean;
	dir_first?: boolean;
	sensitive?: boolean;
	show_hidden?: boolean;
}
