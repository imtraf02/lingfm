# Kế hoạch phát triển: Tauri File Manager

> Stack: Tauri v2 · React 19 · TypeScript · Vite · Tailwind CSS · Zustand

---

## Mục tiêu

Xây dựng ứng dụng quản lý file desktop đa nền tảng (Windows, macOS, Linux) với giao diện React, xử lý file system bằng Rust, hỗ trợ duyệt thư mục, xem trước file, tìm kiếm và theo dõi thay đổi thời gian thực.

---

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────┐
│              Frontend (React + TS)               │
│  UI Components · Zustand State · Custom Hooks    │
│              Tauri API Layer (invoke)            │
└────────────────────┬────────────────────────────┘
                     │  IPC Bridge (Commands + Events)
┌────────────────────▼────────────────────────────┐
│              Rust Backend (Tauri Core)           │
│  File Commands · Search Engine · File Watcher   │
│                OS File System                   │
└─────────────────────────────────────────────────┘
```

---

## Cấu trúc thư mục dự án

```
file-manager/
├── src/                        # React frontend
│   ├── components/
│   │   ├── file-explorer/      # Danh sách file (grid/list)
│   │   ├── sidebar/            # Bookmarks, drives, tree
│   │   ├── preview-pane/       # Xem trước nội dung file
│   │   ├── toolbar/            # Actions, view toggle
│   │   ├── breadcrumb/         # Điều hướng đường dẫn
│   │   └── context-menu/       # Chuột phải
│   ├── hooks/
│   │   ├── use-file-system.ts    # Gọi Tauri commands
│   │   ├── use-search.ts        # Tìm kiếm file
│   │   ├── use-preview.ts       # Load preview
│   │   └── use-watcher.ts       # Lắng nghe file events
│   ├── store/
│   │   └── useStore.ts         # Zustand global state
│   ├── lib/
│   │   └── tauri.ts            # Type-safe invoke wrapper
│   └── types/
│       └── fs.ts               # FileEntry, Metadata, ...
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── fs.rs           # read_dir, copy, move, delete
│   │   │   ├── search.rs       # search_files với walkdir
│   │   │   └── preview.rs      # get_preview, detect MIME
│   │   └── watcher.rs          # File system watcher
│   ├── Cargo.toml
│   └── tauri.conf.json
```

---

## Phase 1 — Setup & Scaffolding (COMPLETED)

**Thời gian:** 2–3 ngày

### Checklist

- [x] Tạo project với `create-tauri-app`
- [x] Cài Tailwind CSS + shadcn/ui
- [x] Cài Zustand + TanStack Query
- [x] Thiết lập Vite aliases (`@/` → `src/`)
- [x] Cấu hình permissions (Tauri v2 Capabilities)
- [x] Tạo type-safe `invoke` wrapper

---

## Phase 2 — Core File Operations (IN PROGRESS)

**Thời gian:** 5–7 ngày

### Rust commands

| Command        | Tham số                     | Trả về           | Trạng thái |
| -------------- | --------------------------- | ---------------- | ---------- |
| `read_dir`     | `path: String`              | `Vec<FileEntry>` | [x] Done   |
| `copy_file`    | `src, dest: String`         | `()`             | [ ]        |
| `move_file`    | `src, dest: String`         | `()`             | [ ]        |
| `delete_file`  | `path: String, trash: bool` | `()`             | [ ]        |
| `rename_file`  | `path, new_name: String`    | `()`             | [ ]        |
| `create_dir`   | `path: String`              | `()`             | [ ]        |
| `get_metadata` | `path: String`              | `FileMetadata`   | [x] Done   |

**Kiểu dữ liệu dùng chung:**

```rust
#[derive(Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,   // Unix timestamp
    pub extension: Option<String>,
}
```

### React components

- **`FileExplorer`** — hiển thị dạng grid hoặc list, hỗ trợ chọn nhiều file (Shift + Click, Ctrl + Click)
- **`Breadcrumb`** — điều hướng đường dẫn, click từng segment để nhảy
- **`ContextMenu`** — chuột phải: Open, Copy, Cut, Paste, Rename, Delete, Properties
- **`FileItem`** — icon theo loại file, tên, kích thước, ngày sửa
- **Drag & Drop** — kéo thả giữa thư mục dùng HTML5 DnD API + Tauri `move_file`

### Checklist

- [x] Viết `read_dir`, `get_metadata` trong Rust
- [ ] Viết `copy_file`, `move_file`, `delete_file`, `rename_file`
- [x] Xử lý lỗi với `tauri::Error` + trả về thông báo rõ ràng
- [x] Build `FileExplorer` component (grid view)
- [ ] Build `Breadcrumb` component
- [ ] Thêm list view, toggle grid/list
- [ ] Build `ContextMenu` với Radix UI
- [ ] Implement drag & drop
- [ ] Hiện dialog xác nhận khi xóa

---

## Phase 3 — Advanced Features

**Thời gian:** 7–10 ngày

### 3a. Tìm kiếm file

```rust
// search.rs — dùng walkdir + rayon để search song song
#[tauri::command]
pub async fn search_files(
    root: String,
    query: String,
    file_type: Option<String>,   // "image", "video", "document", ...
    max_size: Option<u64>,
) -> Result<Vec<FileEntry>, String>
```

- Hỗ trợ glob pattern (`*.rs`, `report-*`)
- Filter theo loại MIME (`image/*`, `text/*`)
- Filter theo kích thước, ngày sửa
- Kết quả stream dần về frontend qua Tauri events (không chờ xong mới trả)

### 3b. File Watcher

```rust
// watcher.rs — dùng notify crate
// Emit event về frontend khi có thay đổi
app.emit("file_changed", FileChangeEvent {
    kind: "created" | "modified" | "deleted",
    path: String,
});
```

Frontend lắng nghe:

```ts
// useWatcher.ts
await listen<FileChangeEvent>("file_changed", (event) => {
  // Refresh thư mục hiện tại nếu liên quan
  queryClient.invalidateQueries({ queryKey: ["dir", currentPath] });
});
```

### 3c. Preview Pane

| Loại file     | Cách preview                              |
| ------------- | ----------------------------------------- |
| Text / code   | Highlight cú pháp với Shiki               |
| Ảnh           | `<img src="asset://...">`                 |
| Video / audio | `<video>` / `<audio>` native              |
| PDF           | `<iframe>` hoặc PDF.js                    |
| Binary        | Hiện metadata: kích thước, MIME, ngày tạo |

### 3d. Tính năng bổ sung

- **Tabs** — mở nhiều thư mục song song
- **Bookmarks** — ghim đường dẫn yêu thích vào sidebar
- **History** — Back/Forward như trình duyệt
- **Dual panel** — chia đôi màn hình (kiểu Total Commander)

### Checklist

- [ ] Viết `search_files` command Rust (walkdir + stream)
- [ ] Build Search bar + kết quả realtime
- [ ] Implement File Watcher + tự refresh khi có thay đổi
- [ ] Build Preview Pane (text, ảnh, video)
- [ ] Integrate Shiki cho code preview
- [ ] Thêm tab navigation
- [ ] Thêm Bookmarks vào sidebar
- [ ] Thêm Back/Forward history

---

## Phase 4 — Polish & Packaging

**Thời gian:** 5–7 ngày

### UX

- **Keyboard shortcuts:** `Enter` mở file, `F2` đổi tên, `Delete` xóa, `Ctrl+C/V/X` copy/cut/paste, `Ctrl+F` tìm kiếm, `Alt+←/→` back/forward
- **Undo / Redo stack:** theo dõi thao tác copy/move/delete, cho phép hoàn tác
- **Settings:** dark/light mode, view mặc định (grid/list), hiển thị file ẩn, ngôn ngữ

### Build & distribution

```bash
# Build production
pnpm run tauri build

# Output
# Windows: .msi + .exe
# macOS: .dmg + .app
# Linux: .AppImage + .deb
```

- Code signing (macOS notarization, Windows Authenticode)
- Auto-update với plugin `tauri-plugin-updater`
- CI/CD với GitHub Actions (build 3 platform song song)

### Checklist

- [ ] Map đầy đủ keyboard shortcuts
- [ ] Implement Undo/Redo với command pattern
- [ ] Build Settings screen
- [ ] Tối ưu performance: virtualize danh sách dài (TanStack Virtual)
- [ ] Thêm loading skeleton, empty state, error boundary
- [ ] Viết tests cho Rust commands
- [ ] Cấu hình `tauri build` + code signing
- [ ] Setup GitHub Actions CI/CD

---

## Thư viện tham khảo

| Mục đích             | Thư viện             |
| -------------------- | -------------------- |
| UI components        | shadcn/ui + Radix UI |
| State                | Zustand              |
| Server state / cache | TanStack Query       |
| List ảo hóa          | TanStack Virtual     |
| Code highlighting    | Shiki                |
| Icons                | Lucide React         |
| Styling              | Tailwind CSS         |
| Rust directory walk  | walkdir              |
| Rust file watching   | notify               |
| Rust MIME detection  | mime_guess           |

---

## Rủi ro & lưu ý

**Tauri v2 permissions** rất chặt — khai báo thiếu scope sẽ bị từ chối silently, khó debug. Cần test kỹ trên từng OS.

**File watcher** tiêu tốn tài nguyên nếu watch quá nhiều path. Chỉ watch thư mục đang hiển thị, hủy watcher khi chuyển tab.

**Preview file lớn** (video 4K, ảnh RAW) không đọc vào RAM — dùng `asset://` protocol của Tauri để stream trực tiếp.

**macOS sandbox** giới hạn truy cập một số thư mục hệ thống — cần xin thêm entitlements nếu muốn duyệt `/System` hay `/Library`.
