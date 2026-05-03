import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tauriInvoke } from "@/lib/tauri";
import type {
  FsEvent,
  FsRenameEvent,
  RichFileEntry,
  SortOptions,
  TaskDone,
  TaskProgress,
} from "@/types/fs";

// Re-export for backward compat with components that import FileEntry
export type { RichFileEntry as FileEntry };

function extractError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

export interface ClipboardEntry {
  paths: string[];
  name: string;
  op: "copy" | "cut";
}

// ─── Sort / filter state ──────────────────────────────────────────────────────

export const DEFAULT_SORT: SortOptions = {
  by: "natural",
  reverse: false,
  dir_first: true,
  sensitive: false,
  show_hidden: false,
};

// ─── Task progress tracking ───────────────────────────────────────────────────

export type ActiveTask = TaskProgress & { startedAt: number };

interface FileSystemState {
  currentPath: string;
  entries: RichFileEntry[];
  isLoading: boolean;
  error: string | null;
  history: string[];
  historyIndex: number;
  homePath: string;
  sortOptions: SortOptions;

  // Selection
  selectedPaths: Set<string>;
  selectEntry: (path: string, multi: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkRenamingEntries: RichFileEntry[];
  setBulkRenamingEntries: (entries: RichFileEntry[]) => void;

  // Clipboard
  clipboard: ClipboardEntry | null;
  setClipboard: (entry: ClipboardEntry | null) => void;

  // Tasks (async scheduler)
  activeTasks: Map<number, ActiveTask>;
  lastTrashedPaths: string[][];

  // Sort / filter
  setSortOptions: (opts: Partial<SortOptions>) => Promise<void>;

  // Navigation
  setCurrentPath: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;

  // File ops (legacy — sync)
  deleteEntries: (paths: string[]) => Promise<void>;
  softDeleteEntries: (paths: string[], onProgress?: (done: number, total: number) => void) => Promise<{src: string, dest: string}[]>;
  undoSoftDelete: (items: {src: string, dest: string}[], onProgress?: (done: number, total: number) => void) => Promise<void>;
  commitDelete: (items: {src: string, dest: string}[]) => Promise<void>;
  moveEntry: (src: string, dest: string) => Promise<void>;
  pasteClipboard: (onProgress?: (done: number, total: number) => void) => Promise<void>;
  createDirectory: (name: string) => Promise<void>;
  trashEntries: (paths: string[]) => Promise<void>;
  restoreEntry: (path: string) => Promise<void>;
  undoTrash: () => Promise<void>;
  renameEntry: (from: string, newName: string) => Promise<void>;
  setHomePath: (path: string) => void;

  // Watcher setup (called once on app mount)
  initWatcher: () => Promise<() => void>;
}

// ─── Internal helper: load directory via read_dir_rich ───────────────────────

async function loadDir(
  path: string,
  sort: SortOptions,
): Promise<RichFileEntry[]> {
  return tauriInvoke<RichFileEntry[]>("read_dir_rich", { path, sort });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
  currentPath: "",
  entries: [],
  isLoading: false,
  error: null,
  history: [],
  historyIndex: -1,
  homePath: "",
  selectedPaths: new Set(),
  clipboard: null,
  activeTasks: new Map(),
  lastTrashedPaths: [],
  bulkRenamingEntries: [],
  sortOptions: { ...DEFAULT_SORT },

  setHomePath: (path) => set({ homePath: path }),

  // ── Selection ──────────────────────────────────────────────────────────────

  selectEntry: (path, multi) => {
    const { selectedPaths } = get();
    if (multi) {
      const next = new Set(selectedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      set({ selectedPaths: next });
    } else {
      set({ selectedPaths: new Set([path]) });
    }
  },

  /** Ctrl+A — select every visible entry */
  selectAll: () => {
    const { entries } = get();
    set({ selectedPaths: new Set(entries.map((e) => e.path)) });
  },

  clearSelection: () => set({ selectedPaths: new Set() }),
  setBulkRenamingEntries: (entries) => set({ bulkRenamingEntries: entries }),

  setClipboard: (clipboard) => set({ clipboard }),

  // ── Sort / filter ─────────────────────────────────────────────────────────

  setSortOptions: async (opts) => {
    const next = { ...get().sortOptions, ...opts };
    set({ sortOptions: next, isLoading: true });
    try {
      const entries = await loadDir(get().currentPath, next);
      set({ entries, isLoading: false, sortOptions: next });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  // ── Navigation ────────────────────────────────────────────────────────────

  setCurrentPath: async (path: string) => {
    set({ isLoading: true, error: null, selectedPaths: new Set() });
    try {
      // Switch watcher to new directory
      await tauriInvoke("watch_dir", { path }).catch(() => {});

      const entries = await loadDir(path, get().sortOptions);
      const { history, historyIndex } = get();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(path);
      set({
        currentPath: path,
        entries,
        isLoading: false,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  refresh: async () => {
    const { currentPath, sortOptions } = get();
    if (!currentPath) return;
    set({ isLoading: true, error: null });
    try {
      const entries = await loadDir(currentPath, sortOptions);
      set({ entries, isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  goBack: async () => {
    const { history, historyIndex, sortOptions } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const path = history[newIndex];
      set({ isLoading: true, error: null, selectedPaths: new Set() });
      try {
        await tauriInvoke("watch_dir", { path }).catch(() => {});
        const entries = await loadDir(path, sortOptions);
        set({ currentPath: path, entries, isLoading: false, historyIndex: newIndex });
      } catch (err) {
        set({ error: extractError(err), isLoading: false });
      }
    }
  },

  goForward: async () => {
    const { history, historyIndex, sortOptions } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const path = history[newIndex];
      set({ isLoading: true, error: null, selectedPaths: new Set() });
      try {
        await tauriInvoke("watch_dir", { path }).catch(() => {});
        const entries = await loadDir(path, sortOptions);
        set({ currentPath: path, entries, isLoading: false, historyIndex: newIndex });
      } catch (err) {
        set({ error: extractError(err), isLoading: false });
      }
    }
  },

  // ── File ops (legacy sync) ─────────────────────────────────────────────────

  deleteEntries: async (paths: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all(paths.map(p => tauriInvoke("delete_entry", { path: p })));
      const { currentPath, sortOptions } = get();
      const entries = await loadDir(currentPath, sortOptions);
      set({ entries, isLoading: false, selectedPaths: new Set() });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  softDeleteEntries: async (paths: string[], onProgress?: (done: number, total: number) => void) => {
    set({ isLoading: true, error: null });
    const softDeleted: { src: string; dest: string }[] = [];
    let done = 0;
    const total = paths.length;

    try {
      await Promise.all(paths.map(async (p) => {
        const parts = p.split(/[\\/]/);
        const filename = parts.pop();
        const dir = parts.join("/");
        const dest = `${dir}/.${filename}.lingfm_trash`;
        await tauriInvoke("move_entry", { src: p, dest });
        softDeleted.push({ src: p, dest });
        done++;
        if (onProgress) onProgress(done, total);
      }));

      const { currentPath, sortOptions } = get();
      const entries = await loadDir(currentPath, sortOptions);
      set({ entries, isLoading: false, selectedPaths: new Set() });
      return softDeleted;
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
      return softDeleted;
    }
  },

  undoSoftDelete: async (items: {src: string, dest: string}[], onProgress?: (done: number, total: number) => void) => {
    set({ isLoading: true, error: null });
    let done = 0;
    const total = items.length;

    try {
      await Promise.all(items.map(async (item) => {
        await tauriInvoke("move_entry", { src: item.dest, dest: item.src });
        done++;
        if (onProgress) onProgress(done, total);
      }));

      const { currentPath, sortOptions } = get();
      const entries = await loadDir(currentPath, sortOptions);
      set({ entries, isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  commitDelete: async (items: {src: string, dest: string}[]) => {
    try {
      await Promise.all(items.map(item => tauriInvoke("delete_entry", { path: item.dest })));
    } catch (err) {
      console.error("Failed to commit delete:", err);
    }
  },

  moveEntry: async (src: string, dest: string) => {
    set({ isLoading: true, error: null });
    try {
      await tauriInvoke("move_entry", { src, dest });
      const { currentPath, sortOptions } = get();
      const entries = await loadDir(currentPath, sortOptions);
      set({ entries, isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
      throw err;
    }
  },

  pasteClipboard: async (onProgress?: (done: number, total: number) => void) => {
    const { clipboard, currentPath, sortOptions, entries: currentEntries } = get();
    if (!clipboard) return;

    const existingNames = new Set(currentEntries.map((e) => e.name));
    const total = clipboard.paths.length;
    let done = 0;

    set({ isLoading: true, error: null });
    try {
      // 1. Calculate all destination paths synchronously to avoid collisions
      const operations = clipboard.paths.map((srcPath) => {
        const originalName = srcPath.split(/[\\/]/).pop() || clipboard.name;
        let destName = originalName;
        let destPath = `${currentPath.replace(/\/$/, "")}/${destName}`;

        if (clipboard.op === "cut" && destPath === srcPath) {
          return { srcPath, destPath, skip: true };
        }

        let counter = 1;
        const extMatch = originalName.lastIndexOf(".");
        const hasExt = extMatch > 0;
        const base = hasExt ? originalName.slice(0, extMatch) : originalName;
        const ext = hasExt ? originalName.slice(extMatch) : "";

        while (existingNames.has(destName)) {
          destName = `${base} (${counter})${ext}`;
          destPath = `${currentPath.replace(/\/$/, "")}/${destName}`;
          counter++;
        }

        existingNames.add(destName);
        return { srcPath, destPath, skip: false };
      });

      // 2. Execute operations in parallel
      await Promise.all(operations.map(async (op) => {
        if (op.skip) {
          done++;
          if (onProgress) onProgress(done, total);
          return;
        }

        await tauriInvoke("copy_entry", { src: op.srcPath, dest: op.destPath });
        if (clipboard.op === "cut") {
          await tauriInvoke("delete_entry", { path: op.srcPath });
        }
        done++;
        if (onProgress) onProgress(done, total);
      }));
      
      if (clipboard.op === "cut") {
        set({ clipboard: null });
      }
      const entries = await loadDir(currentPath, sortOptions);
      set({ entries, isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  createDirectory: async (name: string) => {
    const { currentPath, sortOptions } = get();
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPath = `${currentPath.replace(/\/$/, "")}/${trimmed}`;
    set({ isLoading: true, error: null });
    try {
      await tauriInvoke("create_directory", { path: newPath });
      const entries = await loadDir(currentPath, sortOptions);
      set({ entries, isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  trashEntries: async (paths: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all(paths.map(p => tauriInvoke("async_trash", { path: p })));
      set((state) => ({ 
        lastTrashedPaths: [paths, ...state.lastTrashedPaths.slice(0, 9)],
        isLoading: false, 
        selectedPaths: new Set(),
        bulkRenamingEntries: [],
      }));
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
    }
  },

  restoreEntry: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await tauriInvoke("restore_entry", { path });
      set({ isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
      throw err;
    }
  },

  undoTrash: async () => {
    const { lastTrashedPaths } = get();
    if (lastTrashedPaths.length === 0) return;

    const paths = lastTrashedPaths[0];
    set({ isLoading: true, error: null });
    try {
      for (const p of paths) {
        await tauriInvoke("undo_trash", { originalPath: p });
      }
      set((state) => ({ 
        lastTrashedPaths: state.lastTrashedPaths.slice(1),
        isLoading: false 
      }));
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
      throw err;
    }
  },

  renameEntry: async (from: string, newName: string) => {
    set({ isLoading: true, error: null });
    try {
      await tauriInvoke("async_rename", { path: from, newName });
      set({ isLoading: false });
    } catch (err) {
      set({ error: extractError(err), isLoading: false });
      throw err;
    }
  },

  // ── Watcher (called once at app mount) ───────────────────────────────────

  initWatcher: async () => {
    // FS change events → auto-refresh current directory
    const unlistenCreated = await listen<FsEvent>("fs_created", () => {
      get().refresh();
    });
    const unlistenDeleted = await listen<FsEvent>("fs_deleted", () => {
      get().refresh();
    });
    const unlistenModified = await listen<FsEvent>("fs_modified", () => {
      get().refresh();
    });
    const unlistenRenamed = await listen<FsRenameEvent>("fs_renamed", () => {
      get().refresh();
    });

    // Scheduler task progress
    const unlistenProgress = await listen<TaskProgress>("task_progress", (e) => {
      const t = e.payload;
      set((s) => {
        const next = new Map(s.activeTasks);
        next.set(t.id, { ...t, startedAt: next.get(t.id)?.startedAt ?? Date.now() });
        return { activeTasks: next };
      });
    });

    const unlistenDone = await listen<TaskDone>("task_done", (e) => {
      const { id } = e.payload;
      set((s) => {
        const next = new Map(s.activeTasks);
        next.delete(id);
        return { activeTasks: next };
      });
      // Refresh after any completed task
      get().refresh();
    });

    return () => {
      unlistenCreated();
      unlistenDeleted();
      unlistenModified();
      unlistenRenamed();
      unlistenProgress();
      unlistenDone();
    };
  },
}), {
  name: "lingfm-fs-state",
  partialize: (state) => ({
    sortOptions: state.sortOptions,
  }),
}));
