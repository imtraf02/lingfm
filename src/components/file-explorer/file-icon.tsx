import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { RichFileEntry as FileEntry } from "@/types/fs";
import { FILE_TYPE_COLOR, type FileType } from "./utils";

export function FolderSvgIcon({ selected }: { selected: boolean }) {
	return (
		<svg width="46" height="40" viewBox="0 0 46 40" fill="none">
			<rect
				x="0"
				y="9"
				width="46"
				height="29"
				rx="5"
				fill="var(--primary)"
				fillOpacity={selected ? 0.2 : 0.1}
			/>
			<rect
				x="0"
				y="9"
				width="20"
				height="8"
				rx="3"
				fill="var(--primary)"
				fillOpacity={selected ? 0.45 : 0.28}
			/>
			<rect
				x="0"
				y="13"
				width="46"
				height="25"
				rx="5"
				fill="var(--primary)"
				fillOpacity={selected ? 0.65 : 0.48}
			/>
			<rect
				x="1"
				y="14"
				width="44"
				height="22"
				rx="4"
				fill="var(--primary)"
				fillOpacity={selected ? 0.18 : 0.09}
			/>
		</svg>
	);
}

export function FileSvgIcon({
	type,
	ext,
	selected,
}: {
	type: FileType;
	ext: string;
	selected: boolean;
}) {
	const color = FILE_TYPE_COLOR[type];
	const label = ext.length > 4 ? ext.slice(0, 4) : ext;

	return (
		<svg width="40" height="46" viewBox="0 0 40 46" fill="none">
			<path
				d="M5 2h20l10 10v32a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z"
				fill={color}
				fillOpacity={selected ? 0.18 : 0.1}
			/>
			<path
				d="M25 2l10 10H28a2 2 0 01-2-2V2z"
				fill={color}
				fillOpacity={0.42}
			/>
			<path
				d="M5 2h20l10 10v32a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z"
				stroke={color}
				strokeWidth="1"
				strokeOpacity={selected ? 0.6 : 0.35}
			/>
			{label && (
				<text
					x="20"
					y="32"
					textAnchor="middle"
					fontFamily="ui-monospace, 'SF Mono', monospace"
					fontSize={label.length > 3 ? 6.5 : 7.5}
					fontWeight="600"
					fill={color}
					fillOpacity={0.9}
				>
					{label.toUpperCase()}
				</text>
			)}
		</svg>
	);
}

export function ImageThumb({
	entry,
	selected,
}: {
	entry: FileEntry;
	selected: boolean;
}) {
	const [src, setSrc] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					setSrc(convertFileSrc(entry.path));
					observer.disconnect();
				}
			},
			{ rootMargin: "100px" },
		);

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => observer.disconnect();
	}, [entry.path]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"h-11 w-11 overflow-hidden rounded-lg border transition-colors bg-muted/30",
				selected
					? "border-[var(--ring)]"
					: "border-[var(--border)] group-hover:border-[var(--ring)]",
			)}
		>
			{src && (
				<img
					src={src}
					alt={entry.name}
					className="h-full w-full object-cover animate-in fade-in duration-300"
					loading="lazy"
				/>
			)}
		</div>
	);
}
