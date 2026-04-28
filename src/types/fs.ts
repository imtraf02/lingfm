export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number; // Unix timestamp
  extension?: string;
}

export interface FileMetadata {
  size: number;
  modified: number;
  created: number;
  is_readonly: boolean;
}
