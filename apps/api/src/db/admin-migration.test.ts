import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { expect, it } from "vitest";
import { migrationsDirectory } from "../config";

it("migrates existing accounts to non-admin without losing their identity or Steam link", async () => {
  const previousDirectory = await mkdtemp(join(tmpdir(), "tito-pre-admin-"));
  const client = new PGlite();
  try {
    const journal = JSON.parse(
      await readFile(join(migrationsDirectory, "meta/_journal.json"), "utf8"),
    );
    const entries = journal.entries.filter(
      (entry: { idx: number }) => entry.idx <= 7,
    );
    await mkdir(join(previousDirectory, "meta"));
    await writeFile(
      join(previousDirectory, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries }),
    );
    await Promise.all(
      entries.map((entry: { tag: string }) =>
        copyFile(
          join(migrationsDirectory, `${entry.tag}.sql`),
          join(previousDirectory, `${entry.tag}.sql`),
        ),
      ),
    );
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: previousDirectory });
    await client.exec(`
      insert into "user" (id, name, email, steam_id)
      values ('existing-player', 'Existing Player', 'existing@steam.invalid', '76561198030654385');
    `);

    await migrate(db, { migrationsFolder: migrationsDirectory });
    expect(
      (await client.query(`select id, name, steam_id, is_admin from "user"`))
        .rows,
    ).toEqual([
      {
        id: "existing-player",
        name: "Existing Player",
        steam_id: "76561198030654385",
        is_admin: false,
      },
    ]);
    await client.exec(
      `update "user" set is_admin = true where id = 'existing-player'`,
    );
    await migrate(db, { migrationsFolder: migrationsDirectory });
    expect((await client.query(`select is_admin from "user"`)).rows).toEqual([
      { is_admin: true },
    ]);
  } finally {
    await client.close();
    await rm(previousDirectory, { recursive: true, force: true });
  }
});
