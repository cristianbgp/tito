import { randomUUID } from "node:crypto";
import { mkdir, open, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "../config";
import type { Database } from "../db";
import { ReplayError } from "./errors";
import { replayChunkBytes, replayMaxBytes } from "./contracts";
import type { ReplayParser } from "./parser";
import { replayRetention, saveReplay } from "./storage";
import { claimReplayImport } from "./budget";

type Job = {
  id: string;
  owner: string;
  accountId: string;
  directory: string;
  path: string;
  status: "uploading" | "processing" | "complete" | "failed";
  totalBytes: number;
  uploadedBytes: number;
  expires: number;
  matchId: string | null;
  error: string | null;
  controller: AbortController;
  task?: Promise<void>;
  writing: boolean;
};
const lifetime = 30 * 60_000;
const publicState = (job: Job) => ({
  id: job.id,
  status: job.status,
  totalBytes: job.totalBytes,
  uploadedBytes: job.uploadedBytes,
  expiresAt: new Date(job.expires).toISOString(),
  matchId: job.matchId,
  error: job.error,
});
export class ReplayImports {
  private jobs = new Map<string, Job>();
  private started = new Map<string, number>();
  private reserving = false;
  private timer?: ReturnType<typeof setInterval>;
  private root: string;
  constructor(
    private config: Config,
    private db: Database,
    private parser: ReplayParser,
  ) {
    this.root = join(config.dataDir, "replay-uploads");
  }
  async capabilities(owner: string) {
    await this.prune();
    const active = [...this.jobs.values()].find(
      (job) =>
        job.owner === owner && ["uploading", "processing"].includes(job.status),
    );
    return {
      enabled: this.parser.available,
      maxBytes: replayMaxBytes,
      chunkBytes: replayChunkBytes,
      retentionLimit: replayRetention,
      dailyLimit: this.config.replayUserDailyLimit,
      activeImport: active ? publicState(active) : null,
    };
  }
  private async prune() {
    const now = Date.now();
    for (const [id, job] of this.jobs)
      if (job.expires <= now) {
        job.controller.abort();
        await job.task;
        await rm(job.directory, { recursive: true, force: true });
        this.jobs.delete(id);
      }
    for (const [owner, time] of this.started)
      if (time + 60_000 <= now) this.started.delete(owner);
  }
  private async prepare() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    // Abandoned uploads from an API restart expire without retaining replay files.
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue;
      const path = join(this.root, entry.name);
      if (
        !this.jobs.has(entry.name) ||
        (await stat(path)).mtimeMs + lifetime < Date.now()
      )
        await rm(path, { recursive: true, force: true });
    }
    if (!this.timer) {
      this.timer = setInterval(() => {
        void this.prune().catch(() => {});
      }, 60_000);
      this.timer.unref();
    }
  }
  async begin(owner: string, accountId: string, size: number) {
    if (!this.parser.available)
      throw new ReplayError(
        "Replay import is not available on this server yet.",
        503,
      );
    if (
      this.reserving ||
      [...this.jobs.values()].some(
        (j) =>
          ["uploading", "processing"].includes(j.status) &&
          j.expires > Date.now(),
      )
    )
      throw new ReplayError(
        "Another replay import is running. Try again shortly.",
        429,
      );
    if ((this.started.get(owner) ?? 0) + 60_000 > Date.now())
      throw new ReplayError(
        "Wait one minute before starting another replay import.",
        429,
      );
    this.reserving = true;
    try {
      await this.prune();
      await this.prepare();
      await claimReplayImport(
        this.db,
        owner,
        this.config.replayUserDailyLimit,
        this.config.replayDailyLimit,
      );
      const id = randomUUID(),
        directory = join(this.root, id),
        path = join(directory, "replay.dem");
      await mkdir(directory, { mode: 0o700 });
      await (await open(path, "wx", 0o600)).close();
      const job: Job = {
        id,
        owner,
        accountId,
        directory,
        path,
        status: "uploading",
        totalBytes: size,
        uploadedBytes: 0,
        expires: Date.now() + lifetime,
        matchId: null,
        error: null,
        controller: new AbortController(),
        writing: false,
      };
      this.started.set(owner, Date.now());
      this.jobs.set(id, job);
      return publicState(job);
    } finally {
      this.reserving = false;
    }
  }
  private async owned(owner: string, id: string) {
    await this.prune();
    const job = this.jobs.get(id);
    if (!job || job.owner !== owner)
      throw new ReplayError(
        "Replay upload expired or was not found. Import the file again.",
        404,
      );
    return job;
  }
  async status(owner: string, id: string) {
    return publicState(await this.owned(owner, id));
  }
  async chunk(owner: string, id: string, offset: number, bytes: Uint8Array) {
    const job = await this.owned(owner, id);
    if (
      job.status !== "uploading" ||
      job.writing ||
      offset !== job.uploadedBytes ||
      bytes.length < 1 ||
      bytes.length > replayChunkBytes ||
      offset + bytes.length > job.totalBytes
    )
      throw new ReplayError(
        "The replay upload is out of sequence. Import the file again.",
        409,
      );
    if (
      offset === 0 &&
      !Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from("PBDEMS2\0"))
    )
      throw new ReplayError("Choose an uncompressed Dota 2 .dem replay file.");
    job.writing = true;
    try {
      const handle = await open(job.path, "a");
      try {
        await handle.writeFile(bytes);
      } finally {
        await handle.close();
      }
      if (job.controller.signal.aborted)
        throw new ReplayError("Replay import was cancelled.", 409);
      job.uploadedBytes += bytes.length;
      return publicState(job);
    } finally {
      job.writing = false;
    }
  }
  async complete(owner: string, id: string) {
    const job = await this.owned(owner, id);
    if (job.status === "processing" || job.status === "complete")
      return publicState(job);
    if (
      job.status !== "uploading" ||
      job.writing ||
      job.uploadedBytes !== job.totalBytes
    )
      throw new ReplayError(
        "The replay upload is incomplete. Import the full file again.",
        409,
      );
    job.status = "processing";
    job.expires = Date.now() + 180_000;
    job.task = this.process(job);
    return publicState(job);
  }
  private async process(job: Job) {
    let matchId: string | null = null,
      error: string | null = null;
    try {
      const match = await this.parser.parse(
        job.path,
        job.accountId,
        job.controller.signal,
      );
      if (job.controller.signal.aborted)
        throw new ReplayError("Replay import was cancelled.", 409);
      matchId = await saveReplay(
        this.db,
        job.owner,
        job.accountId,
        match,
        this.config.historyMaxMatches,
        job.controller.signal,
      );
    } catch (failure) {
      error =
        failure instanceof ReplayError
          ? failure.message
          : "Replay import failed. Try again shortly.";
    } finally {
      try {
        await rm(job.directory, { recursive: true, force: true });
      } catch {
        error = "Temporary replay cleanup failed. Try again shortly.";
      }
      job.matchId = matchId;
      job.error = error;
      job.status = error ? "failed" : "complete";
      job.expires = Date.now() + lifetime;
    }
  }
  async cancel(owner: string, id: string) {
    const job = await this.owned(owner, id);
    if (job.status === "complete") return publicState(job);
    job.controller.abort();
    if (job.task) await job.task;
    else {
      await rm(job.directory, { recursive: true, force: true });
      job.status = "failed";
      job.error = "Replay import was cancelled.";
    }
    return publicState(job);
  }
  async close() {
    if (this.timer) clearInterval(this.timer);
    for (const job of this.jobs.values()) job.controller.abort();
    await Promise.all(
      [...this.jobs.values()].map(async (job) => {
        await job.task;
        await rm(job.directory, { recursive: true, force: true });
      }),
    );
  }
}
