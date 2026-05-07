use std::{
    fs::Metadata,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FileType {
    File,
    Dir,
    Link,
    Block,
    Char,
    Sock,
    Fifo,
    Unknown,
}

impl FileType {
    pub fn is_dir(self) -> bool { matches!(self, Self::Dir) }
    #[allow(dead_code)]
    pub fn is_file(self) -> bool { matches!(self, Self::File) }
    #[allow(dead_code)]
    pub fn is_link(self) -> bool { matches!(self, Self::Link) }
}

#[derive(Clone, Debug)]
pub struct Cha {
    pub file_type: FileType,
    pub len:       u64,
    pub atime:     Option<SystemTime>,
    pub btime:     Option<SystemTime>,
    pub ctime:     Option<SystemTime>,
    pub mtime:     Option<SystemTime>,
    pub is_hidden: bool,
    pub is_link:   bool,
    pub is_orphan: bool,
    pub link_to:   Option<String>,
    pub mode:  u32,
    pub uid:   u32,
    pub gid:   u32,
    pub nlink: u64,
}

impl Cha {
    pub fn from_meta(name: &str, lmeta: &Metadata, followed: Option<&Metadata>) -> Self {
        #[cfg(unix)]
        use std::os::unix::fs::{MetadataExt, PermissionsExt};

        let is_link = lmeta.file_type().is_symlink();
        let meta = followed.unwrap_or(lmeta);

        let file_type = if is_link && followed.is_none() {
            FileType::Link
        } else if meta.is_dir() {
            FileType::Dir
        } else if meta.is_file() {
            FileType::File
        } else {
            #[cfg(unix)]
            {
                use std::os::unix::fs::FileTypeExt;
                let ft = meta.file_type();
                if ft.is_block_device() {
                    FileType::Block
                } else if ft.is_char_device() {
                    FileType::Char
                } else if ft.is_socket() {
                    FileType::Sock
                } else if ft.is_fifo() {
                    FileType::Fifo
                } else {
                    FileType::Unknown
                }
            }
            #[cfg(not(unix))]
            FileType::Unknown
        };

        #[cfg(unix)]
        let (mode, uid, gid, nlink, ctime) = {
            let m = lmeta;
            let ctime_sys = UNIX_EPOCH
                .checked_add(std::time::Duration::new(m.ctime() as u64, m.ctime_nsec() as u32));
            (
                m.permissions().mode(),
                m.uid(),
                m.gid(),
                m.nlink(),
                ctime_sys,
            )
        };
        #[cfg(not(unix))]
        let (mode, uid, gid, nlink, ctime) = (0u32, 0u32, 0u32, 0u64, None::<SystemTime>);

        #[allow(unused_assignments)]
        let mut is_hidden = false;

        #[cfg(unix)]
        {
            is_hidden = name.starts_with('.');
        }
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_HIDDEN;
            is_hidden = lmeta.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0;
        }

        Self {
            file_type,
            len: meta.len(),
            atime: meta.accessed().ok(),
            btime: meta.created().ok(),
            ctime,
            mtime: meta.modified().ok(),
            is_hidden,
            is_link,
            is_orphan: is_link && followed.is_none(),
            link_to: None,
            mode,
            uid,
            gid,
            nlink,
        }
    }
}

pub fn systime_secs(t: Option<SystemTime>) -> Option<u64> {
    t?.duration_since(UNIX_EPOCH).ok().map(|d| d.as_secs())
}

pub fn read_cha(path: &Path) -> std::io::Result<Cha> {
    let lmeta = path.symlink_metadata()?;
    let (followed, link_to) = if lmeta.file_type().is_symlink() {
        let target = std::fs::read_link(path).ok();
        let followed = std::fs::metadata(path).ok();
        (followed, target.map(|t| t.to_string_lossy().into_owned()))
    } else {
        (None, None)
    };

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();

    let mut cha = Cha::from_meta(&name, &lmeta, followed.as_ref());
    cha.link_to = link_to;
    Ok(cha)
}
