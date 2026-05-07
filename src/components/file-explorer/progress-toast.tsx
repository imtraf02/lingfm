interface CircularProgressProps {
	value: number;
	size?: number;
	strokeWidth?: number;
}

export const CircularProgress = ({
	value,
	size = 20,
	strokeWidth = 2.5,
}: CircularProgressProps) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (value / 100) * circumference;

	return (
		<svg width={size} height={size} className="shrink-0 -rotate-90 transform">
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke="currentColor"
				strokeWidth={strokeWidth}
				fill="transparent"
				className="text-muted-foreground/20"
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke="currentColor"
				strokeWidth={strokeWidth}
				fill="transparent"
				strokeDasharray={circumference}
				style={{ strokeDashoffset: offset }}
				className="text-primary transition-all duration-300 ease-in-out"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const renderProgressToast = (
	label: string,
	done: number,
	total: number,
) => {
	const percentage = (done / total) * 100;
	return (
		<div className="flex w-full min-w-[220px] items-center gap-3">
			<CircularProgress value={percentage} />
			<div className="flex flex-col overflow-hidden">
				<span className="truncate font-medium text-sm">{label}</span>
				<span className="text-muted-foreground text-xs">
					{done} / {total} files
				</span>
			</div>
		</div>
	);
};
