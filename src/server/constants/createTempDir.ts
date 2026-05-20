import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Creates a temporary directory within the specified base directory.
 * If the directory already exists, it returns the existing directory path.
 * If the directory does not exist, it creates the directory and returns the path.
 * @param baseDir - The base directory where the temporary directory will be created.
 * @returns The path of the temporary directory.
 */
export default function createTempDir(baseDir: string): string {
	const _dir = resolve(baseDir, "./tmp");
	if (existsSync(_dir)) return _dir;
	mkdirSync(_dir, { recursive: true });
	return _dir;
}
