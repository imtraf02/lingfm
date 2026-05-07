use std::cmp::Ordering;

macro_rules! return_unless_equal {
    ($ord:expr) => {
        match $ord {
            Ordering::Equal => {}
            ord => return ord,
        }
    };
}

#[inline(always)]
fn compare_left(left: &[u8], right: &[u8], li: &mut usize, ri: &mut usize) -> Ordering {
    loop {
        let l = left.get(*li);
        let r = right.get(*ri);

        match (
            l.is_some_and(|b| b.is_ascii_digit()),
            r.is_some_and(|b| b.is_ascii_digit()),
        ) {
            (true, true) => {
                return_unless_equal!(unsafe { l.unwrap_unchecked().cmp(r.unwrap_unchecked()) })
            }
            (true, false) => return Ordering::Greater,
            (false, true) => return Ordering::Less,
            (false, false) => return Ordering::Equal,
        }

        *li += 1;
        *ri += 1;
    }
}

#[inline(always)]
fn compare_right(left: &[u8], right: &[u8], li: &mut usize, ri: &mut usize) -> Ordering {
    let mut bias = Ordering::Equal;

    loop {
        let l = left.get(*li);
        let r = right.get(*ri);

        match (
            l.is_some_and(|b| b.is_ascii_digit()),
            r.is_some_and(|b| b.is_ascii_digit()),
        ) {
            (true, true) => {
                if bias == Ordering::Equal {
                    bias = unsafe { l.unwrap_unchecked().cmp(r.unwrap_unchecked()) };
                }
            }
            (true, false) => return Ordering::Greater,
            (false, true) => return Ordering::Less,
            (false, false) => return bias,
        }

        *li += 1;
        *ri += 1;
    }
}

pub fn natsort(left: &[u8], right: &[u8], insensitive: bool) -> Ordering {
    let mut li = 0;
    let mut ri = 0;

    loop {
        while left.get(li).is_some_and(|c| c.is_ascii_whitespace()) {
            li += 1;
        }
        while right.get(ri).is_some_and(|c| c.is_ascii_whitespace()) {
            ri += 1;
        }

        match (left.get(li), right.get(ri)) {
            (Some(&ll), Some(&rr)) => {
                if ll.is_ascii_digit() && rr.is_ascii_digit() {
                    if ll == b'0' || rr == b'0' {
                        return_unless_equal!(compare_left(left, right, &mut li, &mut ri));
                    } else {
                        return_unless_equal!(compare_right(left, right, &mut li, &mut ri));
                    }
                    continue;
                }

                if insensitive {
                    return_unless_equal!(ll.to_ascii_lowercase().cmp(&rr.to_ascii_lowercase()));
                } else {
                    return_unless_equal!(ll.cmp(&rr));
                }
            }
            (Some(_), None) => return Ordering::Greater,
            (None, Some(_)) => return Ordering::Less,
            (None, None) => return Ordering::Equal,
        }

        li += 1;
        ri += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn check_sorted(sorted: &[&str]) {
        let mut shuffled = sorted.to_vec();
        shuffled.sort_by(|a, b| natsort(a.as_bytes(), b.as_bytes(), true));
        assert_eq!(sorted, shuffled);
    }

    #[test]
    fn test_natsort_numbers() {
        check_sorted(&["file1", "file2", "file10", "file20", "file100"]);
    }

    #[test]
    fn test_natsort_dates() {
        check_sorted(&["1999-3-3", "1999-12-25", "2000-1-2", "2000-1-10", "2000-3-23"]);
    }
}
