import { AlertTriangle, X } from "lucide-react";

interface ErrorBannerProps {
	message: string;
	onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
	return (
		<div
			className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-red-100"
			role="alert"
		>
			<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
			<p className="min-w-0 flex-1 text-sm">{message}</p>
			<button
				type="button"
				onClick={onDismiss}
				className="neu-button-round flex h-7 w-7 shrink-0 items-center justify-center text-neu-muted hover:text-neu-text"
				aria-label="Dismiss error"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
