// Text shared by the calculator components.
export const common = {
  moreInfo: 'Meer uitleg',
  returns: {
    mix: 'Portefeuille',
    mixOption: (equity: number) => `${equity} % aandelen, ${100 - equity} % obligaties`,
    equity: 'Rendement aandelen',
    bonds: 'Rendement obligaties',
    assetInfo: (real: string, inflation: string, source: string) =>
      `Per jaar, inflatie inbegrepen, vóór kosten. De standaardwaarde is ${real} boven inflatie (${source}) plus de inflatie die u invult (${inflation}); ze volgt de inflatie tot u zelf een cijfer typt.`,
    fee: 'Kosten per jaar',
    feeInfo: 'Lopende kosten van de fondsen, in % per jaar. Een wereldwijd indexfonds (ETF) kost zo\'n 0,2 %; een actief fonds of een bankfonds vaak 1 tot 2 %.',
    result: 'Rendement na kosten',
    resultInfo: (nominal: string, real: string) =>
      `Volgt uit de portefeuille, de twee rendementen en de kosten. ${nominal} per jaar is ${real} boven inflatie.`,
  },
};
