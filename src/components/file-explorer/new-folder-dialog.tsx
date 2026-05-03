import { FolderPlus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface NewFolderDialogProps {
	open: boolean;
	onClose: () => void;
	onCreate: (name: string) => void;
}

export function NewFolderDialog({
	open,
	onClose,
	onCreate,
}: NewFolderDialogProps) {
	const [name, setName] = useState("New Folder");
	const inputRef = useRef<HTMLInputElement>(null);

	const handleOpen = () => {
		setName("New Folder");
		setTimeout(() => inputRef.current?.select(), 50);
	};

	const handleCreate = () => {
		if (name.trim()) {
			onCreate(name.trim());
			onClose();
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (v) handleOpen();
				else onClose();
			}}
		>
			<DialogContent className="max-w-sm bg-[var(--popover)] border-[var(--border)] rounded-[calc(var(--radius)*2)] shadow-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2.5 text-sm font-medium text-foreground">
						<div className="w-7 h-7 rounded-lg bg-accent border border-[var(--border)] flex items-center justify-center">
							<FolderPlus size={14} className="text-[var(--primary)]" />
						</div>
						New Folder
					</DialogTitle>
				</DialogHeader>

				<Input
					ref={inputRef}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleCreate();
						if (e.key === "Escape") onClose();
					}}
					placeholder="Folder name"
					className="mt-3 bg-[var(--input)] border-[var(--border)] focus-visible:ring-[var(--ring)] text-foreground placeholder:text-muted-foreground rounded-lg text-sm font-mono"
					autoFocus
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
						onClick={handleCreate}
						disabled={!name.trim()}
						className="bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-xs h-8"
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
