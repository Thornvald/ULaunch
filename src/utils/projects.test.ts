import { describe, expect, it } from "vitest";

import { normalizeCachedProjects } from "./projects";

describe("project cache", () => {
	it("keeps valid projects and removes duplicate Windows paths", () => {
		const projects = normalizeCachedProjects([
			{
				name: "Project One",
				path: "C:\\Projects\\ProjectOne\\ProjectOne.uproject",
				screenshot_path: null,
				sln_path: null,
			},
			{
				name: "Duplicate",
				path: "c:/projects/projectone/projectone.uproject",
				screenshot_path: null,
				sln_path: null,
			},
		]);

		expect(projects).toHaveLength(1);
		expect(projects[0].name).toBe("Project One");
	});

	it("rejects malformed cached values", () => {
		expect(normalizeCachedProjects(null)).toEqual([]);
		expect(normalizeCachedProjects([
			{ name: "Missing fields", path: "C:\\Broken.uproject" },
			{ name: "", path: "C:\\EmptyName.uproject", screenshot_path: null, sln_path: null },
			{ name: "Wrong type", path: "C:\\Project.txt", screenshot_path: null, sln_path: null },
		])).toEqual([]);
	});
});
