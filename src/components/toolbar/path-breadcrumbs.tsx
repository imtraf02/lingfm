import { Folder } from "lucide-react";
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
	const displaySegments = isWindows ? segments.slice(1) : segments;

	return (
		<Breadcrumb className="flex min-w-0 flex-1 items-center px-1">
			<BreadcrumbList className="flex-nowrap items-center justify-center font-mono text-[12px] leading-none">
				<BreadcrumbItem className="flex items-center">
					<BreadcrumbLink
						className="flex cursor-pointer items-center rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onClick={(e) => {
							e.stopPropagation();
							onPathClick(isWindows ? `${segments[0]}/` : "/");
						}}
					>
						{isWindows ? (
							segments[0]
						) : (
							<Folder size={13} className="shrink-0 text-primary" />
						)}
					</BreadcrumbLink>
				</BreadcrumbItem>

				{displaySegments.map((segment, index) => {
					const isLast = index === displaySegments.length - 1;
					const segmentPath = isWindows
						? segments.slice(0, index + 2).join("/")
						: `/${segments.slice(0, index + 1).join("/")}`;

					return (
						<React.Fragment key={segmentPath}>
							<BreadcrumbSeparator className="flex items-center text-muted-foreground/40">
								/
							</BreadcrumbSeparator>
							<BreadcrumbItem className="flex items-center">
								{isLast ? (
									<BreadcrumbPage
										className="flex max-w-37.5 cursor-default items-center truncate px-2 py-1 font-medium text-foreground"
										onClick={(e) => {
											e.stopPropagation();
											onFinalClick();
										}}
									>
										{segment}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink
										className="flex max-w-30 cursor-pointer items-center truncate rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
