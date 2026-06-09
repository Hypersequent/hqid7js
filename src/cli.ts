#!/usr/bin/env node
/** hqid7 command-line tool: generate and parse hqid7 identifiers. */

import { createRequire } from "node:module";

import { hqid7, parse } from "./index.ts";

function version(): void {
  const require = createRequire(import.meta.url);
  const pkg = require("../package.json") as { version: string };
  console.log(pkg.version);
}

function generate(): void {
  console.log(hqid7());
}

function hex(value: bigint, width: number): string {
  return value.toString(16).toUpperCase().padStart(width, "0");
}

function parseCommand(id: string | undefined): void {
  if (!id) {
    console.error("Error: parse command requires an hqid7 string");
    console.error("Usage: hqid7 parse <hqid7-string>");
    process.exit(1);
  }

  let info;
  try {
    info = parse(id);
  } catch (err) {
    console.error(`Error decoding hqid7: ${(err as Error).message}`);
    process.exit(1);
  }

  const fmt = (d: Date, tz: "UTC" | "local") =>
    d
      .toLocaleString("sv-SE", {
        timeZone: tz === "UTC" ? "UTC" : undefined,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
      })
      .replace(",", "."); // sv-SE uses a comma for the fractional second

  console.log(`hqid7: ${id}`);
  console.log();
  console.log(`Timestamp (UTC):   ${fmt(info.date, "UTC")} UTC`);
  console.log(`Timestamp (Local): ${fmt(info.date, "local")}`);
  console.log(`Unix milliseconds: ${info.timestampMillis}`);
  console.log();
  console.log(`Version:           ${info.version}`);
  console.log(
    `Variant:           ${info.variant} (binary: ${info.variant.toString(2).padStart(2, "0")})`,
  );
  console.log(
    `Sub-ms precision:  ${info.subMillisPrecision} (binary: ${info.subMillisPrecision.toString(2).padStart(12, "0")})`,
  );
  console.log(`Random bits (62):  0x${hex(info.randomBits, 15)}`);
}

function printUsage(): void {
  console.log(`Hypersequent hqid7 Tool

Usage:
  hqid7 <command>

Commands:
  new, generate       Generate and print a new hqid7
  parse <hqid7>       Parse an hqid7 and show timestamp and random parts
  version, -v         Print the hqid7 version
  help, -h, --help    Show this help message

Examples:
  hqid7 new
  hqid7 generate
  hqid7 parse 1C3XR6Gzv_es6ViopPLabMW`);
}

function main(): void {
  const [command, arg] = process.argv.slice(2);

  switch (command) {
    case undefined:
      printUsage();
      break;
    case "new":
    case "generate":
      generate();
      break;
    case "parse":
      parseCommand(arg);
      break;
    case "version":
    case "-v":
    case "--version":
      version();
      break;
    case "help":
    case "-h":
    case "--help":
      printUsage();
      break;
    default:
      console.log(`Unknown command: ${command}\n`);
      printUsage();
      process.exit(1);
  }
}

main();
