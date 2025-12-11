#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import * as path from "path";

import { parseEnvExample } from "./parser";
import { generateConfigFile } from "./generator";

const program = new Command();

program
	.name("envus")
	.description("Generate validated config from .env.example using envus")
	.version("1.0.0");

program
	.command("init")
	.description("Generate envus config file from .env.example")
	.option("-e, --example <path>", "path to .env.example", ".env.example")
	.option(
		"-o, --output <path>",
		"output file (default ./config/index.js)",
		"./config/index.js"
	)

	// grouping behavior
	.option(
		"--group <mode>",
		"grouping mode: explicit | pattern (default explicit)",
		"explicit"
	)

	// override grouping entirely
	.option("--flat", "disable grouping but still validate env keys", false)

	// module output
	.option("--ts", "generate TypeScript output (.ts)")
	.option("--cjs", "generate CommonJS syntax but still output .js")

	// overwrite
	.option("-f, --force", "overwrite existing file", false)

	.action((opts) => {
		const examplePath = path.resolve(opts.example);
		if (!existsSync(examplePath)) {
			console.error(`.env.example not found at: ${examplePath}`);
			process.exit(1);
		}

		// Normalize grouping mode (ignored when flat)
		let groupingMode: "explicit" | "pattern" = "explicit";
		const gm = String(opts.group).toLowerCase();
		if (gm === "pattern") groupingMode = "pattern";
		else if (gm !== "explicit") {
			console.warn(
				`Unknown --group mode "${opts.group}", falling back to "explicit".`
			);
		}

		// Read example file
		const raw = readFileSync(examplePath, "utf-8");

		// Parse
		const { items, diagnostics } = parseEnvExample(raw, {
			enableGrouping: !opts.flat,
			flat: opts.flat,
			groupingMode,
			breakGroups: true, // always true by default
		});

		//
		// Diagnostics handling
		//
		let hasError = false;
		for (const d of diagnostics) {
			const prefix = `${d.severity.toUpperCase()} (line ${d.line}):`;
			if (d.severity === "error") {
				console.error(prefix, d.message);
				hasError = true;
			} else {
				console.warn(prefix, d.message);
			}
		}

		if (hasError) {
			console.error(
				"Aborting due to parser errors. Fix .env.example and try again."
			);
			process.exit(4);
		}

		//
		// Determine output filename & module mode
		//
		let outFile = opts.output;

		if (opts.ts) {
			outFile = outFile.replace(/\.jsx?$/, ".ts");
		}
		// CJS keeps .js extension, no change needed

		const mode: "js" | "ts" | "cjs" = opts.ts ? "ts" : opts.cjs ? "cjs" : "js";

		const finalCode = generateConfigFile({ items }, mode);

		const outPath = path.resolve(outFile);

		// Ensure dir exists
		mkdirSync(path.dirname(outPath), { recursive: true });

		// Prevent accidental overwrite
		if (existsSync(outPath) && !opts.force) {
			console.error(`File exists: ${outPath}. Use --force to overwrite.`);
			process.exit(2);
		}

		// Write config file
		writeFileSync(outPath, finalCode, "utf-8");

		console.log(`Generated config at: ${outPath}`);
	});

program.parse(process.argv);
