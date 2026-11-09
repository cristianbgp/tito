import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createMailer, listLocalEmails } from "./email";
import { readConfig } from "./config";

describe("email delivery", () => {
  it("stores the rendered email locally without contacting Resend", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "tito-mail-"));
    try {
      const mailer = createMailer(readConfig({ DATA_DIR: dataDir }));
      await mailer.sendSignIn(
        "player@example.com",
        "http://localhost:5173/api/auth/magic-link/verify?token=test",
      );
      const messages = await listLocalEmails(dataDir);
      expect(messages).toHaveLength(1);
      expect(messages[0].to).toBe("player@example.com");
      expect(messages[0].html).toContain("token=test");
      expect(messages[0].text).toContain("token=test");
      expect(
        JSON.parse(
          await readFile(
            join(dataDir, "mail", `${messages[0].id}.json`),
            "utf8",
          ),
        ).to,
      ).toBe("player@example.com");
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("surfaces Resend delivery failure instead of claiming success", async () => {
    const mailer = createMailer(
      readConfig({ EMAIL_TRANSPORT: "resend", RESEND_API_KEY: "re_test" }),
      {
        send: async () => ({
          data: null,
          error: { message: "Provider unavailable" },
        }),
      },
    );
    await expect(
      mailer.sendSignIn("player@example.com", "https://tito.example.com/login"),
    ).rejects.toThrow("Provider unavailable");
  });

  it("returns an empty local inbox before any emails exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tito-empty-"));
    try {
      expect(await listLocalEmails(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

it("renders Spanish sign-in email in the local inbox", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "tito-mail-es-"));
  try {
    await createMailer(readConfig({ DATA_DIR: dataDir })).sendSignIn(
      "player@example.com",
      "https://tito.example.com/login?token=test",
      "es",
    );
    const [message] = await listLocalEmails(dataDir);
    expect(message.subject).toBe("Tu enlace para iniciar sesión en Tito");
    expect(message.html).toContain('lang="es"');
    expect(message.text).toContain("Iniciar sesión en Tito");
    expect(message.text).toContain("10 minutos");
    expect(message.html).toContain("token=test");
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
