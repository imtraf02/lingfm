import React from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface PathBreadcrumbsProps {
	path: string;
	onPathClick: (path: string) => void;
	onFinalClick: () => void;
}

export function PathBreadcrumbs({
	path,
	onPathClick,
	onFinalClick,
}: PathBreadcrumbsProps) {
	// Split path and filter out empty strings
	const segments = path.split("/").filter(Boolean);

	// Check if it's Windows style path (C:\...)
	const isWindows = /^[a-zA-Z]:/.test(path);
	const rootLabel = isWindows ? segments[0] : "/";
	const displaySegments = isWindows ? segments.slice(1) : segments;

	return (
		<Breadcrumb className="flex-1 min-w-0 h-full flex items-center">
			<BreadcrumbList className="flex-nowrap gap-0 h-full items-center justify-center font-mono text-[12px] leading-none">
				<BreadcrumbItem className="flex items-center h-full">
					<BreadcrumbLink
						className="px-1 py-0 rounded hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground flex items-center h-full"
						onClick={(e) => {
							e.stopPropagation();
							onPathClick(isWindows ? segments[0] + "/" : "/");
						}}
					>
						{rootLabel}
					</BreadcrumbLink>
				</BreadcrumbItem>

				{displaySegments.map((segment, index) => {
					const isLast = index === displaySegments.length - 1;
					const segmentPath = isWindows
						? segments.slice(0, index + 2).join("/")
						: "/" + segments.slice(0, index + 1).join("/");

					return (
						<React.Fragment key={segmentPath}>
							{(isWindows || index > 0) && (
								<BreadcrumbSeparator className="px-0.5 flex items-center text-muted-foreground/40 h-full">
									/
								</BreadcrumbSeparator>
							)}
							<BreadcrumbItem className="flex items-center h-full">
								{isLast ? (
									<BreadcrumbPage
										className="px-1 py-0 font-medium text-foreground cursor-default max-w-37.5 truncate flex items-center h-full"
										onClick={(e) => {
											e.stopPropagation();
											onFinalClick();
										}}
									>
										{segment}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink
										className="px-1 py-0 rounded hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground max-w-30 truncate flex items-center h-full"
										onClick={(e) => {
											e.stopPropagation();
											onPathClick(segmentPath);
										}}
									>
										{segment}
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</React.Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
