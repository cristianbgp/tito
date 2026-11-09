// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const html = readFileSync("apps/web/public/offline.html", "utf8");
const heroes = [
  { name: "Axe", attackType: "Melee", roles: ["Initiator", "Durable"] },
  { name: "Crystal Maiden", attackType: "Ranged", roles: ["Support"] },
];

async function openReference() {
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/u)![1];
  document.open();
  document.write(html.replace(/<script[\s\S]*?<\/script>/u, ""));
  document.close();
  await new Function(`return (async () => {${script}\n})()`)();
}

function search(value: string) {
  const input = document.querySelector<HTMLInputElement>("#search")!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return input;
}

function selectLanguage(value: string) {
  const select = document.querySelector<HTMLSelectElement>("#language")!;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ heroes }) })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("uses the saved Spanish preference, translates public traits, and only fetches the public catalog", async () => {
  localStorage.setItem("tito:locale", "es");
  await openReference();
  expect(document.documentElement.lang).toBe("es");
  expect(document.title).toBe("Tito · Referencia sin conexión");
  expect(document.querySelector("h1")?.textContent).toBe(
    "Tu referencia pública de héroes, sin conexión.",
  );
  expect(document.querySelector("label[for=language]")?.textContent).toBe(
    "Idioma",
  );
  expect(document.querySelector("small")?.textContent).toContain(
    "Cuerpo a cuerpo",
  );
  expect(document.querySelector("small")?.textContent).toContain("Iniciador");
  expect(document.querySelector("h2")?.textContent).toBe("Axe");
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/reference-catalog.json");
});

test("switches live, preserves search, finds translated roles, and persists the choice", async () => {
  await openReference();
  const input = search("Axe");
  selectLanguage("es");
  expect(input.value).toBe("Axe");
  expect(document.querySelector("#count")?.textContent).toBe("1 héroe");
  search("iniciador");
  expect(document.querySelector("h2")?.textContent).toBe("Axe");
  selectLanguage("en");
  expect(document.documentElement.lang).toBe("en");
  expect(localStorage.getItem("tito:locale")).toBe("en");
  expect(document.querySelector("#search")?.getAttribute("placeholder")).toBe(
    "Search heroes…",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  search("no such hero");
  expect(document.querySelector("#count")?.textContent).toBe(
    "No heroes match this search.",
  );
});

test("defaults to English for invalid or blocked storage and still allows switching", async () => {
  localStorage.setItem("tito:locale", "fr");
  await openReference();
  expect(document.documentElement.lang).toBe("en");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  await openReference();
  expect(document.documentElement.lang).toBe("en");
  expect(() => selectLanguage("es")).not.toThrow();
  expect(document.documentElement.lang).toBe("es");
  expect(document.querySelector("#count")?.textContent).toBe("2 héroes");
});

test("keeps catalog failures translated when searching or changing language", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
  await openReference();
  expect(document.querySelector("#count")?.textContent).toContain(
    "Public references are not cached",
  );
  selectLanguage("es");
  search("Axe");
  expect(document.querySelector("#count")?.textContent).toBe(
    "Las referencias públicas aún no están guardadas en este dispositivo. Conéctate a Tito y habilita primero las referencias sin conexión.",
  );
  expect(document.querySelector("a")?.textContent).toBe(
    "Volver a intentar con Tito",
  );
});
