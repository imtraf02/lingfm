import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

const appWindow = getCurrentWindow();

export function Titlebar() {
	return (
		<div
			data-tauri-drag-region
			className="h-8 bg-card flex justify-between items-center select-none border-b border-border shrink-0"
		>
			<div className="flex items-center px-3 gap-2 pointer-events-none">
				<img src="/tauri.svg" className="w-4 h-4" alt="logo" />
				<span className="text-xs font-medium text-muted-foreground">lingfm</span>
			</div>
			<div className="flex items-center h-full">
				<button
					type="button"
					onClick={() => appWindow.minimize()}
					className="inline-flex justify-center items-center w-11 h-full hover:bg-muted transition-colors"
					id="titlebar-minimize"
				>
					<Minus className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={() => appWindow.toggleMaximize()}
					className="inline-flex justify-center items-center w-11 h-full hover:bg-muted transition-colors"
					id="titlebar-maximize"
				>
					<Square className="w-3 h-3" />
				</button>
				<button
					type="button"
					onClick={() => appWindow.close()}
					className="inline-flex justify-center items-center w-11 h-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
					id="titlebar-close"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
