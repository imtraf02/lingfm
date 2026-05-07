import { useFileSystemStore } from "@/store/use-file-system-store";

interface FooterProps {
	isActive: boolean;
	query: string;
	isLoading: boolean;
	isSearching: boolean;
}

export function Footer({
	isActive,
	query,
	isLoading,
	isSearching,
}: FooterProps) {
	const entries = useFileSystemStore((s) => s.entries);
	const selectedPaths = useFileSystemStore((s) => s.selectedPaths);
	const activeTasks = useFileSystemStore((s) => s.activeTasks);

	return (
		<footer className="flex h-6 shrink-0 items-center justify-between border-border border-t bg-muted px-3 py-1 text-[11px]">
			<div className="flex gap-4">
				{isActive ? (
					<>
						<span>
							{entries.length >= 500 ? "500+" : entries.length} results
						</span>
						<span className="font-medium text-primary">
							Searching: "{query}"
						</span>
					</>
				) : (
					<>
						<span>{entries.length} items</span>
						<span>{entries.filter((e) => e.is_dir).length} folders</span>
						<span>{entries.filter((e) => !e.is_dir).length} files</span>
					</>
				)}
				{selectedPaths.size > 0 && (
					<span className="font-semibold text-primary">
						{selectedPaths.size} selected
					</span>
				)}
			</div>
			<div className="flex items-center gap-4">
				{Array.from(activeTasks.values()).map((task) => (
					<div
						key={task.id}
						className="flex max-w-[200px] items-center gap-2 text-muted-foreground"
					>
						<span className="truncate text-[10px] capitalize">
							{task.kind} {task.name}
						</span>
						<div className="h-1 w-16 overflow-hidden rounded-full bg-border">
							<div
								className="h-full bg-primary transition-all duration-300 ease-out"
								style={{
									width: `${
										task.total > 0
											? Math.max(5, (task.done / task.total) * 100)
											: 100
									}%`,
								}}
							/>
						</div>
					</div>
				))}
				<div className="flex items-center gap-2">
					{(isLoading || isSearching) && (
						<span className="animate-pulse text-muted-foreground">
							{isSearching ? "Searching…" : "Loading…"}
						</span>
					)}
					<div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
				</div>
			</div>
		</footer>
	);
}
