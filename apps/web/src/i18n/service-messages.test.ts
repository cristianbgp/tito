import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "./index";
import { serviceText } from "./service-messages";

afterEach(() => setLocale("en", false));

describe("serviceText", () => {
  it("uses the active locale for known API errors and canned questions", () => {
    const message = "Sign in to request hero suggestions.";
    setLocale("en", false);
    expect(serviceText(message)).toBe(message);
    setLocale("es", false);
    expect(serviceText(message)).toBe(
      "Inicia sesión para solicitar sugerencias de héroes.",
    );
    expect(serviceText("What should I check in the replay?")).toBe(
      "¿Qué debería revisar en la repetición?",
    );
    setLocale("en", false);
    expect(serviceText(message)).toBe(message);
  });

  it("translates only complete server-owned dynamic templates", () => {
    setLocale("es", false);
    expect(serviceText("Hero 42")).toBe("Héroe 42");
    expect(serviceText("Anti-Mage is listed as melee.")).toBe(
      "Anti-Mage figura con ataque cuerpo a cuerpo.",
    );
    expect(
      serviceText(
        "Axe: Initiator, Durable. These are catalog tags, not the role played in a particular match.",
      ),
    ).toBe(
      "Axe: Iniciador, Resistente. Estas son etiquetas del catálogo, no el rol jugado en una partida específica.",
    );
    expect(
      serviceText(
        "Hero 42: deaths averaged 0 in the latest five comparable saved games and 3.25 in the prior five. This is a personal sample, not proof of impact or cause.",
      ),
    ).toBe(
      "Héroe 42: el promedio de las muertes fue 0 en las últimas cinco partidas guardadas comparables y 3.25 en las cinco anteriores. Es una muestra personal, no demuestra impacto ni causas.",
    );
    expect(
      serviceText(
        "3 retained games: 2 wins and 0 losses across 2 known results. Match summaries describe outcomes; they do not explain why they happened.",
      ),
    ).toBe(
      "3 partidas conservadas: 2 victorias y 0 derrotas de 2 resultados conocidos. Los resúmenes de partidas describen los resultados; no explican por qué ocurrieron.",
    );
  });

  it("preserves unknown, user, external and AI prose exactly", () => {
    setLocale("es", false);
    for (const message of [
      "I played Hero 42 and won.",
      "Hero 42: deaths averaged 5, so you caused the loss.",
      "Sign in to request hero suggestions. Extra text",
      "Axe",
      "Black King Bar",
      "Hero 42\nUser text",
      "Hero 42\n",
      "toString",
      "constructor",
      "",
    ])
      expect(serviceText(message)).toBe(message);
  });
});
