// ─── Legacy FileEntry (read_directory) ───────────────────────────────────────

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number; // Unix timestamp (seconds)
  extension?: string;
}

// ─── RichFileEntry (read_dir_rich) — Yazi-inspired, full metadata ─────────────

export interface RichFileEntry extends FileEntry {
  is_link: boolean;       // symlink
  is_hidden: boolean;     // dot-file on Unix / HIDDEN attr on Windows
  is_orphan: boolean;     // broken symlink (target does not exist)
  mode: number;           // Unix permission bits (e.g. 0o755)
  uid: number;
  gid: number;
  nlink: number;
  atime?: number;         // access time (Unix seconds)
  btime?: number;         // birth/creation time
  ctime?: number;         // inode change time
  mtime?: number;         // modification time (replaces `modified`)
  link_to?: string;       // symlink target path
}

// ─── Task progress (emitted by FmScheduler) ──────────────────────────────────

export interface TaskProgress {
  id: number;
  kind: "copy" | "move" | "delete" | "trash" | "rename";
  name: string;
  total: number;     // bytes
  done: number;      // bytes transferred
  found: number;     // items discovered
  processed: number; // items completed
  failed: number;
}

export interface TaskDone {
  id: number;
  kind: string;
  success: boolean;
  errors: string[];
}

// ─── FS watcher events ───────────────────────────────────────────────────────

export interface FsEvent {
  path: string;
}

export interface FsRenameEvent {
  old_path: string;
  new_path: string;
}

// ─── Misc ────────────────────────────────────────────────────────────────────

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
