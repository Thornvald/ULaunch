import { describe, expect, it } from "vitest";

import { engineVersion, pathKey, uniqueEngines, uniquePaths } from "./paths";

describe("path utilities", () => {
	it("normalizes separators and case for Windows comparisons", () => {
		expect(pathKey("C:/Epic/UE_5.8")).toBe(pathKey("c:\\epic\\ue_5.8"));
	});

	it("removes duplicate paths without changing order", () => {
		expect(uniquePaths(["C:\\Projects", "c:/projects", "D:\\Projects"]))
			.toEqual(["C:\\Projects", "D:\\Projects"]);
	});

	it("removes duplicate engine records by path", () => {
		expect(uniqueEngines([
			{ version: "5.8", path: "C:\\Epic\\UE_5.8\\UnrealEditor.exe" },
			{ version: "Duplicate", path: "c:/epic/ue_5.8/unrealeditor.exe" },
		])).toHaveLength(1);
	});

	it("reads the version from an Unreal installation folder", () => {
		expect(engineVersion("C:\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe"))
			.toBe("5.8");
	});
});
