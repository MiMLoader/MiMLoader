import Elysia from "elysia";

export const proxy = new Elysia({ prefix: "proxy" }).get(
	"*",
	async ({ path }) => {
		const resourcePath = `patched${path.replace("/proxy", "")}`;
		return Bun.file(resourcePath);
	},
);
