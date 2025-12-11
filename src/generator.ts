import { ParsedItem } from "./parser";

/**
 * Infer minimal type meta (we only implement enum detection in parser)
 * Generator will use enumValues if present; otherwise default inference:
 * - blank -> required string
 * - true/false -> boolean
 * - number-like -> number
 * - otherwise -> string (default provided if sample non-empty)
 */
function inferTypeFromSample(sample: string) {
	const s = sample.trim();
	if (s === "")
		return { type: "string", required: true, defaultValue: undefined };
	if (/^(true|false)$/i.test(s))
		return {
			type: "boolean",
			required: false,
			defaultValue: s.toLowerCase() === "true",
		};
	if (/^-?\d+(\.\d+)?$/.test(s))
		return { type: "number", required: false, defaultValue: Number(s) };
	return { type: "string", required: false, defaultValue: s };
}

function jsLiteral(value: any, type: string) {
	if (value === undefined) return undefined;
	if (type === "string") return `'${String(value).replace(/'/g, "\\'")}'`;
	return String(value);
}

function ensureNested(root: any, path: string[]) {
	let node = root;
	for (const seg of path) {
		if (!node[seg]) node[seg] = {};
		node = node[seg];
	}
	return node;
}

/**
 * Generate JS/TS/CJS code for the parsed structure.
 * mode: 'js' => ESM JS (import / export const config)
 * mode: 'ts' => TypeScript (index.ts, ESM style)
 * mode: 'cjs' => CommonJS JS file (require / module.exports)
 */
export function generateConfigFile(
	parsed: { items: ParsedItem[] },
	mode: "js" | "ts" | "cjs"
) {
	const root: any = {};
	const topLevel: ParsedItem[] = [];

	// build nested structure from groupPath
	for (const it of parsed.items) {
		if (it.groupPath && it.groupPath.length > 0) {
			const parent = ensureNested(root, it.groupPath);
			parent[it.propertyName] = it;
		} else {
			topLevel.push(it);
		}
	}

	// header / imports
	let out = "";
	if (mode === "cjs") {
		out += `const { loadEnv, defineConfig, schema } = require("envus");\n\n`;
	} else {
		out += `import { loadEnv, defineConfig, schema } from "envus";\n\n`;
	}

	out += `loadEnv();\n\n`;

	const exportLeft =
		mode === "cjs"
			? `module.exports.config = defineConfig(`
			: `export const config = defineConfig(`;
	out += `${exportLeft}{\n`;

	// helper to emit nested groups recursively
	function emitGroup(obj: any, indent: string) {
		const lines: string[] = [];
		for (const key of Object.keys(obj)) {
			const val = obj[key];
			if ((val as any).fullKey) {
				const it: ParsedItem = val as any;
				if (it.enumValues && it.enumValues.length > 0) {
					// enum branch
					const enumList = it.enumValues
						.map((v) => `'${v.replace(/'/g, "\\'")}'`)
						.join(", ");
					// don't add default because sample was enum-list, not a chosen default
					const schemaCall = [
						`schema("${it.fullKey}")`,
						`.string()`,
						`.enum([${enumList}])`,
					].join("");
					lines.push(`${indent}${key}: ${schemaCall},`);
				} else {
					const inferred = inferTypeFromSample(it.valueSample);
					const def = jsLiteral(inferred.defaultValue, inferred.type);
					const schemaParts = [
						`schema("${it.fullKey}")`,
						`.${inferred.type}()`,
					];
					if (inferred.required) schemaParts.push(`.required()`);
					else if (def !== undefined) schemaParts.push(`.default(${def})`);
					lines.push(`${indent}${key}: ${schemaParts.join("")},`);
				}
			} else {
				// nested object
				const nested = emitGroup(val, indent + "  ");
				lines.push(`${indent}${key}: {\n${nested}\n${indent}},`);
			}
		}
		return lines.join("\n");
	}

	const nestedText = emitGroup(root, "  ");
	if (nestedText.trim().length > 0) out += nestedText + "\n";

	// emit top-level items
	for (const it of topLevel) {
		if (it.enumValues && it.enumValues.length > 0) {
			const enumList = it.enumValues
				.map((v) => `'${v.replace(/'/g, "\\'")}'`)
				.join(", ");
			const schemaCall = [
				`schema("${it.fullKey}")`,
				`.string()`,
				`.enum([${enumList}])`,
			].join("");
			out += `  ${it.propertyName}: ${schemaCall},\n`;
		} else {
			const inferred = inferTypeFromSample(it.valueSample);
			const def = jsLiteral(inferred.defaultValue, inferred.type);
			const schemaParts = [`schema("${it.fullKey}")`, `.${inferred.type}()`];
			if (inferred.required) schemaParts.push(`.required()`);
			else if (def !== undefined) schemaParts.push(`.default(${def})`);
			out += `  ${it.propertyName}: ${schemaParts.join("")},\n`;
		}
	}

	out += `});\n`;
	return out;
}
