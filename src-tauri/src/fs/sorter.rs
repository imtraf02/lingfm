use crate::fs::file::{RichFileEntry, SortOptions};
use crate::shared::natsort::natsort;
use std::cmp::Ordering;

pub fn sort_rich_entries(items: &mut Vec<RichFileEntry>, opts: SortOptions) {
    let sort_by = opts.by.as_deref().unwrap_or("natural");
    let reverse = opts.reverse.unwrap_or(false);
    let dir_first = opts.dir_first.unwrap_or(true);
    let sensitive = opts.sensitive.unwrap_or(false);

    items.sort_unstable_by(|a, b| {
        if dir_first && a.is_dir != b.is_dir {
            return b.is_dir.cmp(&a.is_dir);
        }

        let ord = match sort_by {
            "mtime" => {
                let cmp = a.mtime.cmp(&b.mtime);
                if reverse { cmp.reverse() } else { cmp }
            }
            "btime" => {
                let cmp = a.btime.cmp(&b.btime);
                if reverse { cmp.reverse() } else { cmp }
            }
            "size" => {
                let cmp = a.size.cmp(&b.size);
                if reverse { cmp.reverse() } else { cmp }
            }
            "ext" => {
                let ae = a.extension.as_deref().filter(|_| !a.is_dir).unwrap_or("");
                let be = b.extension.as_deref().filter(|_| !b.is_dir).unwrap_or("");
                let cmp = if sensitive {
                    ae.cmp(be)
                } else {
                    ae.to_lowercase().cmp(&be.to_lowercase())
                };
                if reverse { cmp.reverse() } else { cmp }
            }
            "alpha" => {
                let cmp = if sensitive {
                    a.name.cmp(&b.name)
                } else {
                    a.name.to_lowercase().cmp(&b.name.to_lowercase())
                };
                if reverse { cmp.reverse() } else { cmp }
            }
            _ => {
                let ord = natsort(a.name.as_bytes(), b.name.as_bytes(), !sensitive);
                if reverse { ord.reverse() } else { ord }
            }
        };

        if ord == Ordering::Equal {
            natsort(a.name.as_bytes(), b.name.as_bytes(), true)
        } else {
            ord
        }
    });
}
