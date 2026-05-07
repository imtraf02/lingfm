import {
	audioDir,
	desktopDir,
	documentDir,
	downloadDir,
	homeDir,
	pictureDir,
	videoDir,
} from "@tauri-apps/api/path";
import {
	Download,
	FileText,
	Home,
	Image,
	Monitor,
	Music,
	Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PlaceItem } from "@/components/sidebar/sidebar-item";

export function useSidebarPaths() {
	const [places, setPlaces] = useState<PlaceItem[]>([]);

	useEffect(() => {
		async function loadPaths() {
			const resolve = async (fn: () => Promise<string>, fallback: string) => {
				try {
					return await fn();
				} catch {
					return fallback;
				}
			};

			const home = await resolve(homeDir, "/home");
			const desktop = await resolve(desktopDir, `${home}/Desktop`);
			const downloads = await resolve(downloadDir, `${home}/Downloads`);
			const documents = await resolve(documentDir, `${home}/Documents`);
			const pictures = await resolve(pictureDir, `${home}/Pictures`);
			const videos = await resolve(videoDir, `${home}/Videos`);
			const music = await resolve(audioDir, `${home}/Music`);

			setPlaces([
				{ label: "Home", icon: <Home size={15} />, path: home },
				{ label: "Desktop", icon: <Monitor size={15} />, path: desktop },
				{ label: "Downloads", icon: <Download size={15} />, path: downloads },
				{ label: "Documents", icon: <FileText size={15} />, path: documents },
				{ label: "Pictures", icon: <Image size={15} />, path: pictures },
				{ label: "Videos", icon: <Video size={15} />, path: videos },
				{ label: "Music", icon: <Music size={15} />, path: music },
			]);
		}
		loadPaths();
	}, []);

	return places;
}
