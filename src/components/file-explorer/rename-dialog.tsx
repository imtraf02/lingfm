import { Pencil } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface RenameDialogProps {
	open: boolean;
	initialName: string;
	onClose: () => void;
	onRename: (newName: string) => void;
}

export function RenameDialog({
	open,
	initialName,
	onClose,
	onRename,
}: RenameDialogProps) {
	const [name, setName] = useState(initialName);
	const inputRef = useRef<HTMLInputElement>(null);

	// Update name when dialog opens with new initialName
	useEffect(() => {
		if (open) {
			setName(initialName);
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
					// Select everything except extension if it's a file
					const dotIndex = initialName.lastIndexOf(".");
					if (dotIndex > 0) {
						inputRef.current.setSelectionRange(0, dotIndex);
					} else {
						inputRef.current.select();
					}
				}
			}, 50);
		}
	}, [open, initialName]);

	const handleRename = () => {
		const trimmed = name.trim();
		if (trimmed && trimmed !== initialName) {
			onRename(trimmed);
			onClose();
		} else if (trimmed === initialName) {
			onClose();
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-sm bg-[var(--popover)] border-[var(--border)] rounded-[calc(var(--radius)*2)] shadow-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2.5 text-sm font-medium text-foreground">
						<div className="w-7 h-7 rounded-lg bg-accent border border-[var(--border)] flex items-center justify-center">
							<Pencil size={14} className="text-[var(--primary)]" />
						</div>
						Rename
					</DialogTitle>
				</DialogHeader>

				<Input
					ref={inputRef}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleRename();
						if (e.key === "Escape") onClose();
					}}
					placeholder="New name"
					className="mt-3 bg-[var(--input)] border-[var(--border)] focus-visible:ring-[var(--ring)] text-foreground placeholder:text-muted-foreground rounded-lg text-sm font-mono"
				/>

				<DialogFooter className="mt-4 gap-2">
					<Button
						variant="ghost"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg text-xs h-8"
					>
						Cancel
					</Button>
					<Button
						onClick={handleRename}
						disabled={!name.trim() || name.trim() === initialName}
						className="bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-xs h-8"
					>
						Rename
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
