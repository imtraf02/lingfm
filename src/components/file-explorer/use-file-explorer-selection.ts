import { useEffect, useRef, useState } from "react";
import { useFileSystemStore } from "@/store/use-file-system-store";

const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => {
	if (a.size !== b.size) return false;
	for (const item of a) if (!b.has(item)) return false;
	return true;
};

export function useFileExplorerSelection(
	_gridRef: React.RefObject<HTMLDivElement | null>,
	selectionBoxRef: React.RefObject<HTMLDivElement | null>,
) {
	const [isSelecting, setIsSelecting] = useState(false);
	const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
	const rafRef = useRef<number>(null);
	const initialSelectionRef = useRef<Set<string>>(new Set());
	const isDraggingRef = useRef(false);

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if ((e.target as HTMLElement).closest("[data-path]")) return;
		if (e.button !== 0) return;

		const selectedPaths = useFileSystemStore.getState().selectedPaths;
		if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
			useFileSystemStore.getState().clearSelection();
			initialSelectionRef.current = new Set();
		} else {
			initialSelectionRef.current = new Set(selectedPaths);
		}

		dragStartPosRef.current = { x: e.clientX, y: e.clientY };
		setIsSelecting(true);
		isDraggingRef.current = false;
	};

	useEffect(() => {
		if (!isSelecting || !dragStartPosRef.current) return;

		const handlePointerMove = (e: PointerEvent) => {
			if (!dragStartPosRef.current) return;

			if (rafRef.current) cancelAnimationFrame(rafRef.current);

			rafRef.current = requestAnimationFrame(() => {
				if (!dragStartPosRef.current || !selectionBoxRef.current) return;

				const startX = dragStartPosRef.current.x;
				const startY = dragStartPosRef.current.y;
				const currentX = e.clientX;
				const currentY = e.clientY;

				const dx = Math.abs(currentX - startX);
				const dy = Math.abs(currentY - startY);

				if (!isDraggingRef.current && (dx > 5 || dy > 5)) {
					isDraggingRef.current = true;
				}

				const x = Math.min(startX, currentX);
				const y = Math.min(startY, currentY);

				selectionBoxRef.current.style.left = `${x}px`;
				selectionBoxRef.current.style.top = `${y}px`;
				selectionBoxRef.current.style.width = `${dx}px`;
				selectionBoxRef.current.style.height = `${dy}px`;
				selectionBoxRef.current.style.display = "block";

				const newSelected = new Set(initialSelectionRef.current);
				const elements = document.querySelectorAll("[data-path]");

				elements.forEach((el) => {
					const rect = el.getBoundingClientRect();
					const intersect = !(
						rect.right < x ||
						rect.left > x + dx ||
						rect.bottom < y ||
						rect.top > y + dy
					);

					const path = el.getAttribute("data-path");
					if (path) {
						if (intersect) {
							newSelected.add(path);
						} else if (!initialSelectionRef.current.has(path)) {
							newSelected.delete(path);
						}
					}
				});

				const currentState = useFileSystemStore.getState();
				if (!areSetsEqual(currentState.selectedPaths, newSelected)) {
					useFileSystemStore.setState({ selectedPaths: newSelected });
				}
			});
		};

		const handlePointerUp = () => {
			setIsSelecting(false);
			dragStartPosRef.current = null;
			if (rafRef.current) cancelAnimationFrame(rafRef.current);

			setTimeout(() => {
				isDraggingRef.current = false;
			}, 50);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [isSelecting, selectionBoxRef]);

	return {
		isSelecting,
		handlePointerDown,
		isDragging: isDraggingRef,
	};
}
