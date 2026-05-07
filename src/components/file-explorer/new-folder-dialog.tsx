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
			<DialogContent className="max-w-sm rounded-[calc(var(--radius)*2)] border-[var(--border)] bg-[var(--popover)] shadow-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2.5 font-medium text-foreground text-sm">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-accent">
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
					className="mt-3 rounded-lg border-[var(--border)] bg-[var(--input)] font-mono text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-[var(--ring)]"
					autoFocus
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
						onClick={handleCreate}
						disabled={!name.trim()}
						className="h-8 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90"
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
