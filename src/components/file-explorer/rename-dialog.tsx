import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
			<DialogContent className="max-w-sm rounded-[calc(var(--radius)*2)] border-[var(--border)] bg-[var(--popover)] shadow-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2.5 font-medium text-foreground text-sm">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-accent">
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
					className="mt-3 rounded-lg border-[var(--border)] bg-[var(--input)] font-mono text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-[var(--ring)]"
				/>

				<DialogFooter className="mt-4 gap-2">
					<Button
						variant="ghost"
						onClick={onClose}
						className="h-8 rounded-lg text-muted-foreground text-xs hover:bg-accent hover:text-foreground"
					>
						Cancel
					</Button>
					<Button
						onClick={handleRename}
						disabled={!name.trim() || name.trim() === initialName}
						className="h-8 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90"
					>
						Rename
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
