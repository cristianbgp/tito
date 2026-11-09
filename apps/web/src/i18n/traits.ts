import { getLocale, intlLocale } from "./index";
const spanish: Record<string, string> = {
  Carry: "Carry",
  Escape: "Escape",
  Nuker: "Daño explosivo",
  Initiator: "Iniciador",
  Durable: "Resistente",
  Disabler: "Control",
  Jungler: "Jungla",
  Support: "Apoyo",
  Pusher: "Empuje",
  Melee: "Cuerpo a cuerpo",
  Ranged: "A distancia",
  Strength: "Fuerza",
  Agility: "Agilidad",
  Intelligence: "Inteligencia",
  Universal: "Universal",
  str: "Fuerza",
  agi: "Agilidad",
  int: "Inteligencia",
  all: "Universal",
};
/** Only public catalog traits are translated; proper names and player text stay intact. */
export const traitLabel = (trait: string) =>
  getLocale() === "es" && Object.hasOwn(spanish, trait)
    ? spanish[trait]!
    : trait;
export const searchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase(intlLocale())
    .trim();
