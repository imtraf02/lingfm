import { Folder, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PathInputProps {
	initialPath: string;
	onNavigate: (path: string) => void;
	onClose: () => void;
}

export function PathInput({
	initialPath,
	onNavigate,
	onClose,
}: PathInputProps) {
	const [path, setPath] = useState(initialPath);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			onNavigate(path);
			onClose();
		} else if (e.key === "Escape") {
			onClose();
		}
	};

	return (
		<div className="flex-1 flex items-center gap-2 animate-in fade-in duration-150 h-full min-w-0">
			<div className="flex-1 flex items-center gap-2 h-full min-w-0">
				<Folder size={13} className="text-primary shrink-0" />
				<input
					ref={inputRef}
					type="text"
					value={path}
					onChange={(e) => setPath(e.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 bg-transparent text-[12px] font-mono outline-none text-foreground min-w-0"
					placeholder="Enter path..."
				/>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
			>
				<X size={13} />
			</button>
		</div>
	);
}
