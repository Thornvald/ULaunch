/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				neu: {
					bg: "#111111",
					surface: "#161616",
					elevated: "#1d1d1d",
					inset: "#0c0c0c",
					border: "#2b2b2b",
					text: "#e8e8e8",
					muted: "#929292",
					accent: "#d0d0d0",
				},
			},
			boxShadow: {
				"neu-flat": "8px 8px 18px rgba(0,0,0,0.55), -3px -3px 8px rgba(255,255,255,0.025)",
				"neu-pressed": "inset 6px 6px 12px rgba(0,0,0,0.62), inset -2px -2px 6px rgba(255,255,255,0.025)",
				"neu-sm": "3px 3px 8px rgba(0,0,0,0.55), -2px -2px 5px rgba(255,255,255,0.025)",
			},
		},
	},
	plugins: [],
};
