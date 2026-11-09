import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { render } from "react-email";
import { createElement } from "react";
import { Resend } from "resend";
import { z } from "zod";
import SignInEmail from "../emails/sign-in";
import type { Config } from "./config";
import { emailCopyFor } from "./i18n/email";
import type { Locale } from "./i18n/locale";

export const localEmailSchema = z.object({
  id: z.uuid(),
  to: z.email(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  createdAt: z.iso.datetime(),
});
export type LocalEmail = z.infer<typeof localEmailSchema>;
interface EmailSender {
  send(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ error: { message: string } | null; data?: unknown }>;
}

export function createMailer(config: Config, sender?: EmailSender) {
  const provider =
    config.emailTransport === "resend"
      ? (sender ?? new Resend(config.resendApiKey).emails)
      : undefined;
  return {
    async sendSignIn(to: string, url: string, locale: Locale = "en") {
      const emailCopy = emailCopyFor(locale);
      const template = createElement(SignInEmail, { url, locale });
      const [html, text] = await Promise.all([
        render(template),
        render(template, { plainText: true }),
      ]);
      const message = { to, subject: emailCopy.signIn.subject, html, text };
      if (provider) {
        const result = await provider.send({
          ...message,
          from: config.emailFrom,
        });
        if (result.error)
          throw new Error(`Email delivery failed: ${result.error.message}`);
        return;
      }
      const mail = localEmailSchema.parse({
        ...message,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      });
      const directory = join(config.dataDir, "mail");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(
        join(directory, `${mail.id}.json`),
        JSON.stringify(mail),
        { mode: 0o600, flag: "wx" },
      );
    },
  };
}

export async function listLocalEmails(dataDir: string): Promise<LocalEmail[]> {
  const directory = join(dataDir, "mail");
  const entries = await readdir(directory).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  const messages = await Promise.all(
    entries
      .filter((name) => /^[a-f0-9-]+\.json$/.test(name))
      .map(async (name) =>
        localEmailSchema.parse(
          JSON.parse(await readFile(join(directory, name), "utf8")),
        ),
      ),
  );
  return messages
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}
