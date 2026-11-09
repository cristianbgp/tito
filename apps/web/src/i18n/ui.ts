import type { TranslationOf } from "./types";
export const uiEnglish = {
  language: "Language",
  languageHelp: "Saved on this browser. You can change it at any time.",
  generatedLanguage: (language: "en" | "es") =>
    `Originally generated in ${language === "es" ? "Spanish" : "English"}.`,
  questions: {
    focus: "What should I focus on next?",
    comparison: "How does this compare with my saved games?",
    replay: "What should I check in the replay?",
  },
  siteTitle: "Tito | Your next game, better.",
  siteDescription:
    "Your Dota 2 companion for match insights, hero picks and better decisions.",
  externalContent:
    "Hero and item names, patch notes and other source content keep their original language.",
};
export const uiSpanish: TranslationOf<typeof uiEnglish> = {
  language: "Idioma",
  languageHelp: "Se guarda en este navegador. Puedes cambiarlo cuando quieras.",
  generatedLanguage: (language: "en" | "es") =>
    `Generado originalmente en ${language === "es" ? "español" : "inglés"}.`,
  questions: {
    focus: "¿En qué debería enfocarme ahora?",
    comparison: "¿Cómo se compara con mis partidas guardadas?",
    replay: "¿Qué debería revisar en la repetición?",
  },
  siteTitle: "Tito | Tu próxima partida, mejor.",
  siteDescription:
    "Tu compañero de Dota 2 para analizar partidas, elegir héroes y tomar mejores decisiones.",
  externalContent:
    "Los nombres de héroes y objetos, las notas del parche y otro contenido de las fuentes mantienen su idioma original.",
};
