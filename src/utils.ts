export function toCamelCase(str: string): string {
	return str
		.toLowerCase()
		.replace(/[_-]+([a-z0-9])/g, (_, c) => c.toUpperCase())
		.replace(/^([A-Z])/, (m) => m.toLowerCase());
}

/**
 * Split nested groups, e.g. "app.api.client" -> ["app", "api", "client"]
 */
export function parseGroupPath(raw: string): string[] {
	return raw
		.trim()
		.split(".")
		.map((part) => toCamelCase(part.replace(/\s+/g, "-")));
}

/**
 * Convert group name to uppercase prefix form (DATABASE -> DATABASE_)
 * If envKey starts with that prefix, strip it and return remainder.
 */
export function stripPrefixIfMatch(
	envKey: string,
	groupLastSegment: string
): string {
	const normalized = groupLastSegment.replace(/[-\s]+/g, "_").toUpperCase();
	const prefix = normalized + "_";
	if (envKey.startsWith(prefix)) {
		return envKey.slice(prefix.length);
	}
	return envKey;
}
