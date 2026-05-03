use serde::{Serialize, Deserialize};

/// Legacy entry – kept for backward compatibility with existing frontend.
#[derive(Serialize)]
pub struct FileEntry {
    pub name:      String,
    pub path:      String,
    pub is_dir:    bool,
    pub size:      u64,
    pub modified:  u64,
    pub extension: Option<String>,
}

/// Rich entry – new type using full Yazi-inspired Cha metadata.
#[derive(Serialize)]
pub struct RichFileEntry {
    pub name:      String,
    pub path:      String,
    pub is_dir:    bool,
    pub is_link:   bool,
    pub is_hidden: bool,
    pub is_orphan: bool,
    pub size:      u64,
    pub mode:      u32,
    pub uid:       u32,
    pub gid:       u32,
    pub nlink:     u64,
    pub atime:     Option<u64>,
    pub btime:     Option<u64>,
    pub ctime:     Option<u64>,
    pub mtime:     Option<u64>,
    pub extension: Option<String>,
    pub link_to:   Option<String>,
}

#[derive(Serialize)]
pub struct EntryProperties {
    pub name:        String,
    pub path:        String,
    pub is_dir:      bool,
    pub size:        u64,
    pub size_on_disk: u64,
    pub modified:    u64,
    pub created:     u64,
    pub is_readonly: bool,
    pub item_count:  Option<u64>,
}

#[derive(Serialize)]
pub struct TaskQueued {
    pub id: u32,
}

#[derive(Deserialize, Default, Clone)]
pub struct SortOptions {
    /// "natural" | "alpha" | "mtime" | "btime" | "size" | "ext" | "none"
    pub by:        Option<String>,
    pub reverse:   Option<bool>,
    pub dir_first: Option<bool>,
    pub sensitive: Option<bool>,
    pub show_hidden: Option<bool>,
}
