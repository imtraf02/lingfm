import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StarredItem {
	name: string;
	path: string;
}

interface SidebarState {
	starred: StarredItem[];
	/** Derived Set for O(1) path lookup — always kept in sync with `starred`. */
	starredPaths: Set<string>;
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
			starredPaths: new Set<string>(),
			isSidebarOpen: true,

			addStarred: (item) => {
				const { starred, starredPaths } = get();
				if (!starredPaths.has(item.path)) {
					const next = [...starred, item];
					set({ starred: next, starredPaths: new Set(next.map((s) => s.path)) });
				}
			},

			removeStarred: (path) => {
				const next = get().starred.filter((s) => s.path !== path);
				set({ starred: next, starredPaths: new Set(next.map((s) => s.path)) });
			},

			isStarred: (path) => get().starredPaths.has(path),

			toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),
		}),
		{
			name: "lingfm-sidebar",
			// starredPaths is derived — rebuild it from persisted `starred` on rehydrate
			onRehydrateStorage: () => (state) => {
				if (state) {
					state.starredPaths = new Set(state.starred.map((s) => s.path));
				}
			},
		},
	),
);
