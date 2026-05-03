import { ListRestart, Search, Plus, Hash, Type } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RichFileEntry as FileEntry } from "@/types/fs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BulkRenameDialogProps {
	open: boolean;
	entries: FileEntry[];
	onClose: () => void;
	onRename: (mappings: { from: string, to: string }[]) => void;
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
	const [activeTab, setActiveTab] = useState<"manual" | "replace" | "prefix" | "sequence">("manual");

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
			name.split(findText).join(replaceText)
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
		const mappings = entries.map((entry, index) => ({
			from: entry.path,
			to: newNames[index] || entry.name,
		})).filter(m => m.to !== entries.find(e => e.path === m.from)?.name);

		if (mappings.length > 0) {
			onRename(mappings);
		}
		onClose();
	};

	const textareaValue = newNames.join("\n");
	const isCountMismatch = newNames.length !== entries.length;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-4xl bg-[var(--popover)] border-[var(--border)] rounded-[calc(var(--radius)*2)] shadow-2xl overflow-hidden flex flex-col h-[600px]">
				<DialogHeader className="px-6 py-4 border-b border-border bg-accent/10">
					<DialogTitle className="flex items-center justify-between text-sm font-medium text-foreground">
						<div className="flex items-center gap-2.5">
							<div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
								<ListRestart size={16} className="text-primary" />
							</div>
							<div>
								<p>Bulk Rename</p>
								<p className="text-[10px] text-muted-foreground font-normal">{entries.length} items selected</p>
							</div>
						</div>
						<Button variant="ghost" size="sm" onClick={resetNames} className="h-8 text-[10px] uppercase tracking-wider font-bold">
							Reset to Original
						</Button>
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-1 overflow-hidden">
					{/* Left Sidebar: Tools */}
					<div className="w-64 border-r border-border bg-accent/5 p-4 flex flex-col gap-6">
						<section className="space-y-3">
							<h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Operations</h4>
							<div className="flex flex-col gap-1">
								<ToolButton active={activeTab === "manual"} onClick={() => setActiveTab("manual")} icon={<Type size={14} />} label="Manual Edit" />
								<ToolButton active={activeTab === "replace"} onClick={() => setActiveTab("replace")} icon={<Search size={14} />} label="Find & Replace" />
								<ToolButton active={activeTab === "prefix"} onClick={() => setActiveTab("prefix")} icon={<Plus size={14} />} label="Prefix & Suffix" />
								<ToolButton active={activeTab === "sequence"} onClick={() => setActiveTab("sequence")} icon={<Hash size={14} />} label="Sequence" />
							</div>
						</section>

						<div className="flex-1 flex flex-col justify-center">
							{activeTab === "replace" && (
								<div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
									<div className="space-y-1.5">
										<label className="text-[10px] font-bold text-muted-foreground ml-1">Find</label>
										<Input value={findText} onChange={(e) => setFindText(e.target.value)} className="h-8 text-xs bg-background" placeholder="Text to find..." />
									</div>
									<div className="space-y-1.5">
										<label className="text-[10px] font-bold text-muted-foreground ml-1">Replace</label>
										<Input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className="h-8 text-xs bg-background" placeholder="New text..." />
									</div>
									<Button onClick={applyReplace} disabled={!findText} className="w-full h-8 text-xs">Apply Replace</Button>
								</div>
							)}

							{activeTab === "prefix" && (
								<div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
									<div className="space-y-1.5">
										<label className="text-[10px] font-bold text-muted-foreground ml-1">Prefix</label>
										<Input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="h-8 text-xs bg-background" placeholder="Add to start..." />
									</div>
									<div className="space-y-1.5">
										<label className="text-[10px] font-bold text-muted-foreground ml-1">Suffix</label>
										<Input value={suffix} onChange={(e) => setSuffix(e.target.value)} className="h-8 text-xs bg-background" placeholder="Add to end..." />
									</div>
									<Button onClick={applyPrefixSuffix} disabled={!prefix && !suffix} className="w-full h-8 text-xs">Apply Prefix/Suffix</Button>
								</div>
							)}

							{activeTab === "sequence" && (
								<div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
									<div className="space-y-1.5">
										<label className="text-[10px] font-bold text-muted-foreground ml-1">Pattern (# for number)</label>
										<Input value={seqPattern} onChange={(e) => setSeqPattern(e.target.value)} className="h-8 text-xs bg-background" placeholder="img_#" />
									</div>
									<div className="space-y-1.5">
										<label className="text-[10px] font-bold text-muted-foreground ml-1">Start from</label>
										<Input type="number" value={seqStart} onChange={(e) => setSeqStart(parseInt(e.target.value) || 1)} className="h-8 text-xs bg-background" />
									</div>
									<Button onClick={applySequence} className="w-full h-8 text-xs">Generate Sequence</Button>
								</div>
							)}

							{activeTab === "manual" && (
								<p className="text-[11px] text-muted-foreground italic text-center px-4">
									Edit the names directly in the preview area on the right.
								</p>
							)}
						</div>
					</div>

					{/* Right Area: Preview/Editor */}
					<div className="flex-1 flex flex-col overflow-hidden bg-background">
						<div className="grid grid-cols-2 flex-1 overflow-hidden">
							<div className="border-r border-border flex flex-col overflow-hidden">
								<div className="h-8 flex items-center px-4 bg-accent/5 border-b border-border">
									<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original</span>
								</div>
								<ScrollArea className="flex-1 p-4 font-mono text-[11px] text-muted-foreground/60 leading-relaxed whitespace-pre select-none">
									{entries.map((e) => e.name).join("\n")}
								</ScrollArea>
							</div>
							<div className="flex flex-col overflow-hidden bg-accent/5">
								<div className="h-8 flex items-center px-4 bg-accent/5 border-b border-border justify-between">
									<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Names</span>
									{isCountMismatch && <span className="text-[10px] text-destructive font-bold">Line mismatch!</span>}
								</div>
								<Textarea
									value={textareaValue}
									onChange={(e) => handleTextareaChange(e.target.value)}
									className="flex-1 bg-transparent border-none focus-visible:ring-0 text-foreground rounded-none font-mono text-[11px] leading-relaxed p-4 resize-none"
									placeholder="Each line is a new name..."
									spellCheck={false}
								/>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="px-6 py-4 border-t border-border bg-accent/10 gap-3">
					<Button variant="ghost" onClick={onClose} className="h-9 text-xs">Cancel</Button>
					<Button
						onClick={handleConfirm}
						disabled={isCountMismatch || entries.every((e, i) => e.name === newNames[i])}
						className="h-9 text-xs px-8 bg-primary text-primary-foreground hover:opacity-90 shadow-md"
					>
						Apply All Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ToolButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
				active
					? "bg-primary text-primary-foreground shadow-sm"
					: "text-muted-foreground hover:bg-accent hover:text-foreground"
			)}
		>
			{icon}
			{label}
		</button>
	);
}
