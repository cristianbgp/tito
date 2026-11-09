export function readDatabaseConfig(env: Record<string, string | undefined>) {
  if (!env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is required. Configure PostgreSQL in apps/api/.env locally or in your deployment environment.",
    );
  let target: URL;
  try {
    target = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !target.hostname
  )
    throw new Error("DATABASE_URL must use PostgreSQL.");
  const databaseName = decodeURIComponent(target.pathname.slice(1));
  if (
    !databaseName ||
    databaseName.includes("\0") ||
    Buffer.byteLength(databaseName, "utf8") > 63 ||
    ["template0", "template1"].includes(databaseName)
  )
    throw new Error(
      "DATABASE_URL must name an application database (not a template database), up to 63 bytes long.",
    );
  const maintenance = new URL(target);
  maintenance.pathname = "/postgres";
  return {
    databaseUrl: target.toString(),
    databaseName,
    maintenanceUrl: maintenance.toString(),
  };
}

export function databaseErrorMessage(error: unknown): string {
  let code: string | undefined;
  let cause = error;
  for (
    let depth = 0;
    depth < 5 && cause && typeof cause === "object";
    depth++
  ) {
    if (
      "code" in cause &&
      typeof cause.code === "string" &&
      /^[A-Z0-9_]+$/.test(cause.code)
    ) {
      code = cause.code;
      break;
    }
    cause = "cause" in cause ? cause.cause : undefined;
  }
  if (code === "42501")
    return "PostgreSQL denied database setup. Automatic database creation requires CREATEDB; ask your administrator or database provider to provision the database and grant migration permissions, then rerun bun run db:migrate.";
  if (code === "28P01" || code === "28000")
    return "PostgreSQL authentication failed. Check the credentials in DATABASE_URL.";
  if (
    code === "ECONNREFUSED" ||
    code === "CONNECT_TIMEOUT" ||
    code === "ENOTFOUND"
  )
    return "Cannot reach PostgreSQL. Start your database server and check DATABASE_URL, network access, and TLS settings.";
  if (code === "3D000")
    return "The PostgreSQL database is missing. Provision it through your database provider, or use a role with CREATEDB, then rerun bun run db:migrate.";
  return `PostgreSQL setup failed${code ? ` (${code})` : ""}. Check database connectivity, permissions, and committed migrations.`;
}
