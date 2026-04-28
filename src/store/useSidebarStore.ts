import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StarredItem {
	name: string;
	path: string;
}

interface SidebarState {
	starred: StarredItem[];
	isSidebarOpen: boolean;
	addStarred: (item: StarredItem) => void;
	removeStarred: (path: string) => void;
	isStarred: (path: string) => boolean;
	toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>()(
	persist(
		(set, get) => ({
			starred: [],
			isSidebarOpen: true,

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

			toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),
		}),
		{ name: "lingfm-sidebar" }
	)
);
