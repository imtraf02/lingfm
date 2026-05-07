import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";
import { toast } from "sonner";
import { tauriInvoke } from "@/lib/tauri";
import { useFileSystemStore } from "@/store/use-file-system-store";

export function useDragDrop(currentPath: string, refresh: () => Promise<void>) {
	useEffect(() => {
		let unlisten: (() => void) | undefined;

		async function setup() {
			try {
				const appWindow = getCurrentWebviewWindow();
				unlisten = await appWindow.onDragDropEvent(async (event) => {
					if (event.payload.type === "drop") {
						const { paths } = event.payload;
						let successCount = 0;
						const existingNames = new Set(
							useFileSystemStore.getState().entries.map((e) => e.name),
						);

						for (const srcPath of paths) {
							const originalName = srcPath.split(/[\\/]/).pop() || "unnamed";
							let destName = originalName;

							let counter = 1;
							const extMatch = originalName.lastIndexOf(".");
							const hasExt = extMatch > 0;
							const base = hasExt
								? originalName.slice(0, extMatch)
								: originalName;
							const ext = hasExt ? originalName.slice(extMatch) : "";

							while (existingNames.has(destName)) {
								destName = `${base} (${counter})${ext}`;
								counter++;
							}

							existingNames.add(destName);
							const destPath = `${currentPath.replace(/[\\/]$/, "")}/${destName}`;

							try {
								await tauriInvoke("copy_entry", {
									src: srcPath,
									dest: destPath,
								});
								successCount++;
							} catch (err) {
								toast.error(`Failed to copy ${destName}: ${err}`);
							}
						}

						if (successCount > 0) {
							toast.success(`Imported ${successCount} items`);
							refresh();
						}
					}
				});
			} catch (err) {
				console.error("Failed to setup drag drop listener:", err);
			}
		}

		setup();
		return () => {
			if (unlisten) unlisten();
		};
	}, [currentPath, refresh]);
}
