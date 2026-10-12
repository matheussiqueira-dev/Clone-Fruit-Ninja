// Accuracy = fruits sliced ÷ fruits that left play (sliced or dropped). Bombs never count.
export const computeAccuracy = (sliced: number, missed: number): number => {
  const safeSliced = Number.isFinite(sliced) ? Math.max(0, sliced) : 0;
  const safeMissed = Number.isFinite(missed) ? Math.max(0, missed) : 0;
  const total = safeSliced + safeMissed;
  if (total === 0) return 0;
  return Math.round((safeSliced / total) * 100);
};

const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export const formatInteger = (value: number): string =>
  integerFormatter.format(Number.isFinite(value) ? value : 0);

export const formatPercent = (value: number): string => `${formatInteger(value)}%`;
