import { Hash, ListRestart, Plus, Search, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RichFileEntry as FileEntry } from "@/types/fs";

interface BulkRenameDialogProps {
	open: boolean;
	entries: FileEntry[];
	onClose: () => void;
	onRename: (mappings: { from: string; to: string }[]) => void;
}

export function BulkRenameDialog({
	open,
	entries,
	onClose,
	onRename,
}: BulkRenameDialogProps) {
	const [newNames, setNewNames] = useState<string[]>([]);
	const [findText, setFindText] = useState("");
	const [replaceText, setReplaceText] = useState("");
	const [prefix, setPrefix] = useState("");
	const [suffix, setSuffix] = useState("");
	const [seqPattern, setSeqPattern] = useState("item_#");
	const [seqStart, setSeqStart] = useState(1);
	const [activeTab, setActiveTab] = useState<
		"manual" | "replace" | "prefix" | "sequence"
	>("manual");

	useEffect(() => {
		if (open) {
			setNewNames(entries.map((e) => e.name));
			setFindText("");
			setReplaceText("");
			setPrefix("");
			setSuffix("");
			setActiveTab("manual");
		}
	}, [open, entries]);

	const handleTextareaChange = (value: string) => {
		const lines = value.split("\n");
		setNewNames(lines);
	};

	const applyReplace = () => {
		if (!findText) return;
		const updated = newNames.map((name) =>
			name.split(findText).join(replaceText),
		);
		setNewNames(updated);
	};

	const applyPrefixSuffix = () => {
		const updated = newNames.map((name) => {
			const dotIndex = name.lastIndexOf(".");
			const stem = dotIndex > 0 ? name.substring(0, dotIndex) : name;
			const ext = dotIndex > 0 ? name.substring(dotIndex) : "";
			return `${prefix}${stem}${suffix}${ext}`;
		});
		setNewNames(updated);
		setPrefix("");
		setSuffix("");
	};

	const applySequence = () => {
		const updated = newNames.map((name, i) => {
			const dotIndex = name.lastIndexOf(".");
			const ext = dotIndex > 0 ? name.substring(dotIndex) : "";
			const num = (seqStart + i).toString().padStart(2, "0");
			return seqPattern.replace("#", num) + ext;
		});
		setNewNames(updated);
	};

	const resetNames = () => {
		setNewNames(entries.map((e) => e.name));
	};

	const handleConfirm = () => {
		const mappings = entries
			.map((entry, index) => ({
				from: entry.path,
				to: newNames[index] || entry.name,
			}))
			.filter((m) => m.to !== entries.find((e) => e.path === m.from)?.name);

		if (mappings.length > 0) {
			onRename(mappings);
		}
		onClose();
	};

	const textareaValue = newNames.join("\n");
	const isCountMismatch = newNames.length !== entries.length;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="flex h-[600px] max-w-4xl flex-col overflow-hidden rounded-[calc(var(--radius)*2)] border-[var(--border)] bg-[var(--popover)] shadow-2xl">
				<DialogHeader className="border-border border-b bg-accent/10 px-6 py-4">
					<DialogTitle className="flex items-center justify-between font-medium text-foreground text-sm">
						<div className="flex items-center gap-2.5">
							<div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
								<ListRestart size={16} className="text-primary" />
							</div>
							<div>
								<p>Bulk Rename</p>
								<p className="font-normal text-[10px] text-muted-foreground">
									{entries.length} items selected
								</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={resetNames}
							className="h-8 font-bold text-[10px] uppercase tracking-wider"
						>
							Reset to Original
						</Button>
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-1 overflow-hidden">
					{/* Left Sidebar: Tools */}
					<div className="flex w-64 flex-col gap-6 border-border border-r bg-accent/5 p-4">
						<section className="space-y-3">
							<h4 className="px-1 font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
								Operations
							</h4>
							<div className="flex flex-col gap-1">
								<ToolButton
									active={activeTab === "manual"}
									onClick={() => setActiveTab("manual")}
									icon={<Type size={14} />}
									label="Manual Edit"
								/>
								<ToolButton
									active={activeTab === "replace"}
									onClick={() => setActiveTab("replace")}
									icon={<Search size={14} />}
									label="Find & Replace"
								/>
								<ToolButton
									active={activeTab === "prefix"}
									onClick={() => setActiveTab("prefix")}
									icon={<Plus size={14} />}
									label="Prefix & Suffix"
								/>
								<ToolButton
									active={activeTab === "sequence"}
									onClick={() => setActiveTab("sequence")}
									icon={<Hash size={14} />}
									label="Sequence"
								/>
							</div>
						</section>

						<div className="flex flex-1 flex-col justify-center">
							{activeTab === "replace" && (
								<div className="fade-in slide-in-from-left-2 animate-in space-y-4 duration-200">
									<div className="space-y-1.5">
										<label
											htmlFor="find-text"
											className="ml-1 font-bold text-[10px] text-muted-foreground"
										>
											Find
										</label>
										<Input
											id="find-text"
											value={findText}
											onChange={(e) => setFindText(e.target.value)}
											className="h-8 bg-background text-xs"
											placeholder="Text to find..."
										/>
									</div>
									<div className="space-y-1.5">
										<label
											htmlFor="replace-text"
											className="ml-1 font-bold text-[10px] text-muted-foreground"
										>
											Replace
										</label>
										<Input
											id="replace-text"
											value={replaceText}
											onChange={(e) => setReplaceText(e.target.value)}
											className="h-8 bg-background text-xs"
											placeholder="New text..."
										/>
									</div>
									<Button
										type="button"
										onClick={applyReplace}
										disabled={!findText}
										className="h-8 w-full text-xs"
									>
										Apply Replace
									</Button>
								</div>
							)}

							{activeTab === "prefix" && (
								<div className="fade-in slide-in-from-left-2 animate-in space-y-4 duration-200">
									<div className="space-y-1.5">
										<label
											htmlFor="prefix-text"
											className="ml-1 font-bold text-[10px] text-muted-foreground"
										>
											Prefix
										</label>
										<Input
											id="prefix-text"
											value={prefix}
											onChange={(e) => setPrefix(e.target.value)}
											className="h-8 bg-background text-xs"
											placeholder="Add to start..."
										/>
									</div>
									<div className="space-y-1.5">
										<label
											htmlFor="suffix-text"
											className="ml-1 font-bold text-[10px] text-muted-foreground"
										>
											Suffix
										</label>
										<Input
											id="suffix-text"
											value={suffix}
											onChange={(e) => setSuffix(e.target.value)}
											className="h-8 bg-background text-xs"
											placeholder="Add to end..."
										/>
									</div>
									<Button
										type="button"
										onClick={applyPrefixSuffix}
										disabled={!prefix && !suffix}
										className="h-8 w-full text-xs"
									>
										Apply Prefix/Suffix
									</Button>
								</div>
							)}

							{activeTab === "sequence" && (
								<div className="fade-in slide-in-from-left-2 animate-in space-y-4 duration-200">
									<div className="space-y-1.5">
										<label
											htmlFor="seq-pattern"
											className="ml-1 font-bold text-[10px] text-muted-foreground"
										>
											Pattern (# for number)
										</label>
										<Input
											id="seq-pattern"
											value={seqPattern}
											onChange={(e) => setSeqPattern(e.target.value)}
											className="h-8 bg-background text-xs"
											placeholder="img_#"
										/>
									</div>
									<div className="space-y-1.5">
										<label
											htmlFor="seq-start"
											className="ml-1 font-bold text-[10px] text-muted-foreground"
										>
											Start from
										</label>
										<Input
											id="seq-start"
											type="number"
											value={seqStart}
											onChange={(e) =>
												setSeqStart(parseInt(e.target.value, 10) || 1)
											}
											className="h-8 bg-background text-xs"
										/>
									</div>
									<Button
										type="button"
										onClick={applySequence}
										className="h-8 w-full text-xs"
									>
										Generate Sequence
									</Button>
								</div>
							)}

							{activeTab === "manual" && (
								<p className="px-4 text-center text-[11px] text-muted-foreground italic">
									Edit the names directly in the preview area on the right.
								</p>
							)}
						</div>
					</div>

					{/* Right Area: Preview/Editor */}
					<div className="flex flex-1 flex-col overflow-hidden bg-background">
						<div className="grid flex-1 grid-cols-2 overflow-hidden">
							<div className="flex flex-col overflow-hidden border-border border-r">
								<div className="flex h-8 items-center border-border border-b bg-accent/5 px-4">
									<span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
										Original
									</span>
								</div>
								<ScrollArea className="flex-1 select-none whitespace-pre p-4 font-mono text-[11px] text-muted-foreground/60 leading-relaxed">
									{entries.map((e) => e.name).join("\n")}
								</ScrollArea>
							</div>
							<div className="flex flex-col overflow-hidden bg-accent/5">
								<div className="flex h-8 items-center justify-between border-border border-b bg-accent/5 px-4">
									<span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
										New Names
									</span>
									{isCountMismatch && (
										<span className="font-bold text-[10px] text-destructive">
											Line mismatch!
										</span>
									)}
								</div>
								<Textarea
									value={textareaValue}
									onChange={(e) => handleTextareaChange(e.target.value)}
									className="flex-1 resize-none rounded-none border-none bg-transparent p-4 font-mono text-[11px] text-foreground leading-relaxed focus-visible:ring-0"
									placeholder="Each line is a new name..."
									spellCheck={false}
								/>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="gap-3 border-border border-t bg-accent/10 px-6 py-4">
					<Button variant="ghost" onClick={onClose} className="h-9 text-xs">
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={
							isCountMismatch || entries.every((e, i) => e.name === newNames[i])
						}
						className="h-9 bg-primary px-8 text-primary-foreground text-xs shadow-md hover:opacity-90"
					>
						Apply All Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ToolButton({
	active,
	onClick,
	icon,
	label,
}: {
	active: boolean;
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium text-xs transition-all duration-200",
				active
					? "bg-primary text-primary-foreground shadow-sm"
					: "text-muted-foreground hover:bg-accent hover:text-foreground",
			)}
		>
			{icon}
			{label}
		</button>
	);
}
