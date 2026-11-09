import { expect, test } from "vitest";
import { es } from "./es";
import { companionCopy } from "./es/companion";
import { coachingCopy, sessionCopy, usageCopy } from "./es/coaching";

test.each([
  {
    n: 0,
    heroes: "0 héroes",
    notes: "0 notas guardadas",
    samples: "0 muestras válidas",
    games: "0 partidas",
    remaining: "0 restantes",
    outcomes: "0 victorias · 0 derrotas · 0 desconocidos",
    day: "hoy UTC · 0 partidas guardadas · 0 victorias · 0 derrotas",
    tooltip: "hoy: 0 victorias, 0 derrotas, 0 resultados no disponibles",
  },
  {
    n: 1,
    heroes: "1 héroe",
    notes: "1 nota guardada",
    samples: "1 muestra válida",
    games: "1 partida",
    remaining: "1 restante",
    outcomes: "1 victoria · 1 derrota · 1 desconocido",
    day: "hoy UTC · 1 partida guardada · 1 victoria · 1 derrota · 1 resultado desconocido",
    tooltip: "hoy: 1 victoria, 1 derrota, 1 resultado no disponible",
  },
  {
    n: 2,
    heroes: "2 héroes",
    notes: "2 notas guardadas",
    samples: "2 muestras válidas",
    games: "2 partidas",
    remaining: "2 restantes",
    outcomes: "2 victorias · 2 derrotas · 2 desconocidos",
    day: "hoy UTC · 2 partidas guardadas · 2 victorias · 2 derrotas · 2 resultados desconocidos",
    tooltip: "hoy: 2 victorias, 2 derrotas, 2 resultados no disponibles",
  },
])("uses Spanish quantity agreement for $n", (expected) => {
  const { n } = expected;
  expect(es.draft.visibleHeroes(n)).toBe(expected.heroes);
  expect(companionCopy.notesCount(n)).toBe(expected.notes);
  expect(es.progress.validSamples(String(n))).toBe(expected.samples);
  expect(coachingCopy.samples(n)).toBe(expected.samples);
  expect(es.review.samples(n)).toBe(expected.games);
  expect(es.draft.historyUsed(n)).toBe(
    `Contexto de experiencia de ${expected.games} ${n === 1 ? "guardada" : "guardadas"}.`,
  );
  expect(usageCopy.remaining(n)).toBe(expected.remaining);
  expect(sessionCopy.outcomes(n, n, n)).toBe(expected.outcomes);
  expect(coachingCopy.day("hoy", n, n, n, n)).toBe(expected.day);
  expect(es.progress.weekTooltip("hoy", String(n), String(n), String(n))).toBe(
    expected.tooltip,
  );
  expect(es.progress.period("a", "b", String(n))).toBe(
    `Últimos 28 días · a–b (UTC) · ${expected.games} ${n === 1 ? "guardada" : "guardadas"}`,
  );
  expect(es.progress.scope(String(n))).toContain(
    `${expected.games} ${n === 1 ? "conservada" : "conservadas"}`,
  );
  expect(es.progress.minimum(String(n))).toBe(
    `Se ${n === 1 ? "necesita" : "necesitan"} al menos ${expected.samples} en cada período para comparar.`,
  );
});
