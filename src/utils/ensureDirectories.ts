import { mkdir } from "fs/promises";
import { existsSync } from "fs";

export async function ensureDirectories(paths: string[]) {
  for (const path of paths) {
    if (!existsSync(path)) {
      try {
        await mkdir(path, { recursive: true });
        console.log(`Created directory: ${path}`);
      } catch (error) {
        console.error(`Failed to create directory ${path}:`, error);
        throw new Error(`Required directory ${path} could not be created`);
      }
    }
  }
}
