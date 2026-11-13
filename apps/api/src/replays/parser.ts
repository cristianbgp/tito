import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { promisify } from "node:util";
import type { Config } from "../config";
import type { z } from "zod";
import type { matchDetailSchema } from "../dota/schemas";
import { normalizeReplay } from "./normalize";
import { ReplayError } from "./errors";

export type ReplayParser = {
  available: boolean;
  parse: (
    path: string,
    accountId: string,
    signal: AbortSignal,
  ) => Promise<z.infer<typeof matchDetailSchema>>;
};
const execute = promisify(execFile);
export function createReplayParser(config: Config): ReplayParser {
  return {
    available:
      existsSync(config.replayParserJar) && existsSync(config.replayJavaBin),
    async parse(path, accountId, signal) {
      try {
        const { stdout } = await execute(
          config.replayJavaBin,
          [
            "-Xmx512m",
            "-cp",
            config.replayParserJar,
            "opendota.ReplayImport",
            path,
            accountId,
          ],
          {
            timeout: 120_000,
            maxBuffer: 2 * 1024 * 1024,
            signal,
            // The parser receives no API keys, database credentials or application secrets.
            env: {
              PATH: process.env.PATH,
              LANG: "C.UTF-8",
              TMPDIR: dirname(path),
            },
            encoding: "utf8",
            windowsHide: true,
          },
        );
        return normalizeReplay(JSON.parse(stdout), accountId);
      } catch (error) {
        if (error instanceof ReplayError) throw error;
        const failure = error as {
          code?: number | string;
          killed?: boolean;
          name?: string;
        };
        if (failure.code === 3)
          throw new ReplayError(
            "Your linked Steam account is not a player in this replay.",
            403,
          );
        if (failure.killed || failure.name === "AbortError")
          throw new ReplayError(
            "Replay processing stopped or took too long. Try importing again.",
            504,
          );
        throw new ReplayError(
          "This replay could not be read. Download the complete .dem file from Dota and try again.",
        );
      }
    },
  };
}
