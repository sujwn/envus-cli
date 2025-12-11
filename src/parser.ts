import { parseGroupPath, stripPrefixIfMatch, toCamelCase } from "./utils";

export type Diagnostic = {
	line: number;
	message: string;
	severity: "warning" | "error";
};

export type ParsedItem = {
	fullKey: string;
	valueSample: string;
	groupPath?: string[];
	propertyName: string;
	enumValues?: string[];
};

export type ParserOptions = {
	enableGrouping: boolean;
	groupingMode?: "explicit" | "pattern";
	breakGroups?: boolean;
	flat?: boolean;
};

const ENV_REGEX = /^([A-Z][A-Z0-9_]+)=(.*)$/;
const GROUP_REGEX = /^#\s*@group:\s*(.+)$/i;
const POSSIBLE_ENUM = /^[A-Za-z0-9_-]+(\|[A-Za-z0-9_-]+)+$/;

function detectEnum(value: string): string[] | undefined {
	const s = value.trim();
	if (POSSIBLE_ENUM.test(s)) {
		return s.split("|").map((v) => v.trim());
	}
	return undefined;
}

export function parseEnvExample(text: string, opts: ParserOptions) {
	const breakGroups = opts.breakGroups ?? true;
	const isFlat = opts.flat ?? false;

	const lines = text.split(/\r?\n/);
	const items: ParsedItem[] = [];
	const diagnostics: Diagnostic[] = [];

	let currentGroupPath: string[] | undefined;
	const seenKeys = new Set<string>();

	const patternMode = opts.groupingMode === "pattern";
	const explicitMode = opts.groupingMode === "explicit";

	for (let idx = 0; idx < lines.length; idx++) {
		const raw = lines[idx];
		const line = raw.trim();
		const lineNumber = idx + 1;

		//
		// ------------------------------------------------------------
		// FLAT MODE: no grouping, comments ignored, still validate KEY=VALUE
		// ------------------------------------------------------------
		//
		if (isFlat) {
			if (line.startsWith("#")) continue;
			if (line.length === 0) continue;

			const m = line.match(ENV_REGEX);
			if (!m) {
				diagnostics.push({
					line: lineNumber,
					message: `Invalid env line format: "${line}". Expected KEY=VALUE.`,
					severity: "warning",
				});
				continue;
			}

			const key = m[1];
			const rawValue = m[2] ?? "";
			const enumValues = detectEnum(rawValue);

			items.push({
				fullKey: key,
				valueSample: rawValue,
				propertyName: toCamelCase(key),
				enumValues,
			});

			continue;
		}

		//
		// ------------------------------------------------------------
		// GROUPED MODE (explicit or pattern)
		// ------------------------------------------------------------
		//

		// FIRST: blank lines break grouping
		if (raw.trim().length === 0) {
			if (breakGroups) currentGroupPath = undefined;
			continue;
		}

		// PATTERN GROUPING MODE:
		// Ignore explicit @group directives WITHOUT warning
		if (patternMode && GROUP_REGEX.test(line)) {
			continue;
		}

		// ignore normal comments
		if (line.startsWith("#") && !GROUP_REGEX.test(line)) {
			continue;
		}

		// EXPLICIT grouping directive
		if (explicitMode && GROUP_REGEX.test(line) && opts.enableGrouping) {
			try {
				const g = line.match(GROUP_REGEX)!;
				currentGroupPath = parseGroupPath(g[1]);
			} catch (err: any) {
				diagnostics.push({
					line: lineNumber,
					message: `Invalid group directive: ${String(err?.message ?? err)}`,
					severity: "error",
				});
			}
			continue;
		}

		// parse env line
		const m = line.match(ENV_REGEX);
		if (!m) {
			diagnostics.push({
				line: lineNumber,
				message: `Invalid env line format: "${line}". Expected KEY=VALUE.`,
				severity: "warning",
			});
			continue;
		}

		const key = m[1];
		const rawValue = m[2] ?? "";

		// duplicate check
		if (seenKeys.has(key)) {
			diagnostics.push({
				line: lineNumber,
				message: `Duplicate key detected: "${key}"`,
				severity: "warning",
			});
		}
		seenKeys.add(key);

		let propertyNameCandidate = key;
		let assignedGroup = currentGroupPath;

		//
		// Pattern grouping applied only if no explicit group active
		//
		if (patternMode && opts.enableGrouping && !currentGroupPath) {
			const prefix = key.split("_")[0].toLowerCase();
			assignedGroup = [toCamelCase(prefix)];

			// Strip prefix from key name
			const prefixUpper = prefix.toUpperCase() + "_";
			if (key.startsWith(prefixUpper)) {
				propertyNameCandidate = key.slice(prefixUpper.length);
			}
		}

		//
		// Explicit prefix trimming
		//
		if (explicitMode && opts.enableGrouping && currentGroupPath?.length) {
			const lastSegment = currentGroupPath[currentGroupPath.length - 1];
			propertyNameCandidate = stripPrefixIfMatch(
				propertyNameCandidate,
				lastSegment
			);
		}

		const enumValues = detectEnum(rawValue);

		items.push({
			fullKey: key,
			valueSample: rawValue,
			groupPath: assignedGroup,
			propertyName: toCamelCase(propertyNameCandidate),
			enumValues,
		});
	}

	return { items, diagnostics };
}
