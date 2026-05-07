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
		<div
			className="fade-in flex h-full min-w-0 flex-1 animate-in items-center gap-2 duration-150"
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget)) {
					onClose();
				}
			}}
		>
			<div className="flex h-full min-w-0 flex-1 items-center gap-2">
				<Folder size={13} className="shrink-0 text-primary" />
				<input
					ref={inputRef}
					type="text"
					value={path}
					onChange={(e) => setPath(e.target.value)}
					onKeyDown={handleKeyDown}
					className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-foreground outline-none"
					placeholder="Enter path..."
				/>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
			>
				<X size={13} />
			</button>
		</div>
	);
}
