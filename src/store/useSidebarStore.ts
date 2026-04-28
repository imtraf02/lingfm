import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StarredItem {
	name: string;
	path: string;
}

interface SidebarState {
	starred: StarredItem[];
	addStarred: (item: StarredItem) => void;
	removeStarred: (path: string) => void;
	isStarred: (path: string) => boolean;
}

export const useSidebarStore = create<SidebarState>()(
	persist(
		(set, get) => ({
			starred: [],

			addStarred: (item) => {
				const { starred } = get();
				if (!starred.find((s) => s.path === item.path)) {
					set({ starred: [...starred, item] });
				}
			},

			removeStarred: (path) => {
				set({ starred: get().starred.filter((s) => s.path !== path) });
			},

			isStarred: (path) => get().starred.some((s) => s.path === path),
		}),
		{ name: "lingfm-sidebar" }
	)
);
