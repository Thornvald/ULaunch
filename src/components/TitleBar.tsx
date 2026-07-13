import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Rocket, Square, X } from "lucide-react";

interface TitleBarProps {
	onError: (context: string, errorValue: unknown) => Promise<void>;
}

export function TitleBar({ onError }: TitleBarProps) {
	const appWindow = getCurrentWindow();
	const [version, setVersion] = useState<string | null>(null);

	useEffect(() => {
		void getVersion()
			.then(setVersion)
			.catch((errorValue: unknown) => onError("Could not read application version", errorValue));
	}, [onError]);

	async function runWindowAction(context: string, action: () => Promise<void>) {
		try {
			await action();
		} catch (errorValue) {
			await onError(context, errorValue);
		}
	}

	return (
		<div
			data-tauri-drag-region
			className="relative z-50 flex h-12 shrink-0 select-none items-center justify-between border-b border-neu-border bg-neu-surface px-4 shadow-neu-sm"
		>
			<div className="pointer-events-none flex h-8 w-8 items-center justify-center text-neu-muted" data-tauri-drag-region>
				<Rocket className="h-4 w-4" />
			</div>
			<div className="pointer-events-none absolute left-1/2 -translate-x-1/2" data-tauri-drag-region>
				<span className="text-xs font-bold tracking-[0.18em] text-neu-text">ULAUNCH</span>
			</div>
			{version && (
				<span className="pointer-events-none fixed bottom-3 right-4 z-40 text-[10px] font-medium tracking-wide text-neu-muted">
					v{version}
				</span>
			)}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => runWindowAction("Could not minimize window", () => appWindow.minimize())}
					className="neu-button-round flex h-8 w-8 items-center justify-center text-neu-muted hover:text-neu-text"
					aria-label="Minimize window"
				>
					<Minus className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={() => runWindowAction("Could not maximize window", () => appWindow.toggleMaximize())}
					className="neu-button-round flex h-8 w-8 items-center justify-center text-neu-muted hover:text-neu-text"
					aria-label="Toggle maximize window"
				>
					<Square className="h-3 w-3" />
				</button>
				<button
					type="button"
					onClick={() => runWindowAction("Could not close window", () => appWindow.close())}
					className="neu-button-round flex h-8 w-8 items-center justify-center text-neu-muted hover:text-red-400"
					aria-label="Close window"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
