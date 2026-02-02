const LOW_SCORE_WISDOM = [
  "O bambu cresce antes do golpe. Treine mais.",
  "Sua lâmina está aprendendo a respirar.",
  "Calma. O corte nasce do silêncio."
];

const MID_SCORE_WISDOM = [
  "Bom corte. Você já ouve o ritmo.",
  "Seu foco está firme. Continue.",
  "A lâmina começa a obedecer ao seu pulso."
];

const HIGH_SCORE_WISDOM = [
  "Você corta como o vento. Honre o dojo.",
  "Mestre, até as frutas recuam.",
  "Seu corte é preciso. Excelente."
];

const getRandomIndex = (max: number) => {
  if (max <= 1) return 0;
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }
  return Math.floor(Math.random() * max);
};

const pickWisdom = (options: string[]) => options[getRandomIndex(options.length)] ?? "";

export const getSenseiWisdom = (score: number): string => {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;

  if (safeScore < 10) {
    return pickWisdom(LOW_SCORE_WISDOM);
  }
  if (safeScore < 50) {
    return pickWisdom(MID_SCORE_WISDOM);
  }
  return pickWisdom(HIGH_SCORE_WISDOM);
};
