import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import type { StateCreator } from "zustand";
import type {
	FsEvent,
	FsRenameEvent,
	TaskDone,
	TaskProgress,
} from "@/types/fs";
import type { FileSystemState } from "../use-file-system-store";

export type ActiveTask = TaskProgress & { startedAt: number };

export interface TaskSlice {
	activeTasks: Map<number, ActiveTask>;
	initWatcher: () => Promise<() => void>;
}

export const createTaskSlice: StateCreator<
	FileSystemState,
	[],
	[],
	TaskSlice
> = (set, get) => ({
	activeTasks: new Map(),

	initWatcher: async () => {
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

		const unlistenProgress = await listen<TaskProgress>(
			"task_progress",
			(e) => {
				const t = e.payload;
				set((s) => {
					const next = new Map(s.activeTasks);
					next.set(t.id, {
						...t,
						startedAt: next.get(t.id)?.startedAt ?? Date.now(),
					});
					return { activeTasks: next };
				});
			},
		);

		const unlistenDone = await listen<TaskDone>("task_done", (e) => {
			const { id, kind, success, errors } = e.payload;
			set((s) => {
				const next = new Map(s.activeTasks);
				next.delete(id);
				return { activeTasks: next };
			});

			if (success) {
				toast.success(`Task "${kind}" completed successfully`);
			} else if (errors && errors.length > 0) {
				toast.error(`Task "${kind}" failed: ${errors[0]}`);
			}

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
});
