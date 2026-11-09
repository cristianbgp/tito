import { describe, expect, it } from "vitest";
import { readDatabaseConfig, databaseErrorMessage } from "./config";

describe("PostgreSQL setup configuration", () => {
  it("requires an explicit PostgreSQL connection instead of silently selecting embedded storage", () => {
    expect(() => readDatabaseConfig({})).toThrow(/DATABASE_URL/);
  });

  it("identifies the target database and derives a maintenance connection", () => {
    const config = readDatabaseConfig({
      DATABASE_URL:
        "postgres://player:secret@localhost:5432/tito?sslmode=disable",
    });
    expect(config.databaseName).toBe("tito");
    const admin = new URL(config.maintenanceUrl);
    expect(admin.pathname).toBe("/postgres");
    expect(admin.searchParams.get("sslmode")).toBe("disable");
    expect(admin.username).toBe("player");
  });

  it("accepts a provider-provisioned database named postgres", () => {
    expect(
      readDatabaseConfig({
        DATABASE_URL: "postgres://user:password@db.example.com/postgres",
      }).databaseName,
    ).toBe("postgres");
  });

  it.each([
    "file:///tmp/db",
    "postgres://localhost",
    "postgres://localhost/template1",
    `postgres://localhost/${"a".repeat(64)}`,
  ])("rejects unusable target %s", (databaseUrl) => {
    expect(() => readDatabaseConfig({ DATABASE_URL: databaseUrl })).toThrow();
  });

  it("explains a missing database when the role cannot create it", () => {
    const message = databaseErrorMessage({
      code: "42501",
      message: "permission denied to create database",
      detail: "postgres://user:secret@host/tito",
    });
    expect(message).toMatch(/CREATEDB/);
    expect(message).toMatch(/provider|administrator/i);
    expect(message).not.toContain("secret");
  });

  it("explains permissions hidden inside a migration driver error", () => {
    expect(
      databaseErrorMessage({
        cause: {
          code: "42501",
          message: "permission denied for schema public",
        },
      }),
    ).toMatch(/migration permissions/);
  });
});
