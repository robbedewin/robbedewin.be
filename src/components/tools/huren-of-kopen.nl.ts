// All Dutch text of /tools/huren-of-kopen in one place, so a translation is a
// second file with the same keys. Amounts are formatted at run time; no euro
// amount is written out here.
export const t = {
  title: 'Huren of kopen?',
  description:
    'Vergelijk het vermogen van een koper en een huurder in België, jaar na jaar, met de registratierechten en notariskosten van uw gewest.',
  summary: 'Het vermogen van een koper en van een huurder die het verschil belegt, jaar na jaar.',

  tiles: {
    buyer: (n: number) => `Vermogen na ${n} jaar bij kopen`,
    renter: (n: number) => `Vermogen na ${n} jaar bij huren`,
    advantage: 'Voordeel',
    advantageBuy: 'voor kopen',
    advantageRent: 'voor huren',
    ratio: 'Jaarhuur tegenover aankoopprijs',
    ratioSub: (payment: string) => `Aflossing lening: ${payment} per maand`,
    real: 'in euro van vandaag',
    nominal: 'in euro van dat jaar',
  },

  verdict: {
    huren: (n: number, amount: string) =>
      `Na ${n} jaar komt huren en beleggen ${amount} hoger uit dan kopen.`,
    kopen: (n: number, amount: string) =>
      `Na ${n} jaar komt kopen ${amount} hoger uit dan huren en beleggen.`,
    pariteit: (n: number) =>
      `Na ${n} jaar liggen kopen en huren minder dan 5 % uit elkaar. Het cijfer beslist hier niet; kies op wat u zelf belangrijk vindt.`,
    buyerAlways: 'Kopen ligt de hele periode voor.',
    renterAlways: 'Huren ligt de hele periode voor.',
    buyerSince: (year: number) => `Kopen ligt voor vanaf jaar ${year}.`,
    renterSince: (year: number) => `Huren ligt voor vanaf jaar ${year}.`,
  },

  tabs: { vermogen: 'Vermogen', kosten: 'Woonkost per jaar', tabel: 'Tabel' },
  chart: {
    year: (y: number) => `Jaar ${y}`,
    buyer: 'Kopen',
    renter: 'Huren',
    owner: 'Eigenaar: lening en vaste kosten',
    rent: 'Huurder: huur',
    paidOff: 'lening afbetaald',
    vermogenLabel: 'Vermogen van koper en huurder per jaar',
    kostenLabel: 'Wat eigenaar en huurder per jaar aan wonen betalen',
    hint: 'Beweeg over de grafiek, of gebruik de pijltjestoetsen, om een jaar te kiezen.',
  },
  table: {
    year: 'Jaar',
    rent: 'Huur',
    owner: 'Uitgaven eigenaar',
    balance: 'Openstaande lening',
    buyer: 'Vermogen kopen',
    renter: 'Vermogen huren',
  },

  upfront: {
    title: 'Bij de aankoop',
    // How the registration duty is built up; amounts and rates arrive formatted.
    rule: {
      standaard: (rate: string) => `${rate} van de prijs (standaardtarief)`,
      enige_woning: (rate: string) => `${rate} van de prijs (enige eigen woning)`,
      enige_woning_bescheiden: (rate: string, reduction: string, ceiling: string) =>
        `${rate} van de prijs (enige eigen woning), min ${reduction} omdat de prijs niet boven ${ceiling} ligt`,
      abattement: (rate: string, exempt: string) =>
        `${rate} op de prijs boven de eerste ${exempt} (abattement enige eigen woning)`,
      abattement_te_duur: (rate: string, ceiling: string) =>
        `${rate} van de prijs; het abattement vervalt boven ${ceiling}`,
    },
    down: 'Eigen inbreng',
    registration: 'Registratierechten',
    notary: 'Notariskosten aankoopakte',
    creditDeed: 'Kosten kredietakte',
    total: 'Zelf te betalen',
    loanTitle: 'De lening',
    loan: 'Geleend bedrag',
    payment: 'Aflossing per maand',
    interest: 'Intrest over de hele looptijd',
  },

  tipping: {
    title: 'Wat de doorslag geeft',
    info: (years: number) =>
      `Elk cijfer is de waarde waarbij kopen en huren na ${years} jaar gelijk eindigen, met alle andere aannames zoals ze staan. Ligt uw eigen verwachting aan de andere kant, dan draait de uitkomst om.`,
    rent: 'Huur per maand',
    ret: 'Rendement na kosten',
    growth: 'Stijging huizenprijzen',
    now: (value: string) => `(nu ${value})`,
    none: 'buiten bereik',
  },
  owning: {
    title: 'Wat kopen kost in het eerste jaar',
    info: 'De vuistregel van Ben Felix (PWL Capital), met Belgische cijfers: wat eigenaar zijn per jaar kost en u nooit terugkrijgt, in euro van vandaag, tegenover de huur. De aflossing telt niet mee, want die bouwt vermogen op. Rente en rendement staan na inflatie, de waardestijging telt op de hele woning. Een snelle toets naast het jaar-na-jaarmodel erboven, dat de belasting, de verkoopkosten en de lening precies volgt.',
    propertyTax: 'Onroerende voorheffing',
    maintenance: 'Onderhoud',
    insurance: 'Brandverzekering',
    debt: 'Rente na inflatie',
    equity: 'Rendement op de eigen inbreng',
    purchase: (years: number) => `Aankoopkosten, gespreid over ${years} jaar`,
    growth: 'Waardestijging boven inflatie',
    total: 'Samen',
    rent: 'Huur per jaar',
    note: 'Een momentopname van het eerste jaar. Het jaar-na-jaarmodel hierboven telt ook mee dat elke aflossing geld in de woning steekt dat anders belegd zou zijn, en de verkoopkosten en de meerwaardebelasting; daarom kan het anders uitkomen.',
  },

  panel: {
    title: 'Aannames',
    general: 'Algemeen',
    buy: 'Kopen',
    rent: 'Huren',
    invest: 'Beleggen en inflatie',
    reset: 'Standaardwaarden',
    copy: 'Kopieer link',
    copied: 'Link gekopieerd',
  },
  fields: {
    gewest: 'Gewest',
    gewesten: { VL: 'Vlaanderen', WA: 'Wallonië', BR: 'Brussel' },
    reg: 'Tarief registratierechten',
    regInfo: 'De belasting die u aan het gewest betaalt bij de aankoop van een bestaande woning. Het tarief volgt het gewest en het vakje enige eigen woning; u kunt het aanpassen.',
    regVL2027: 'Vlaanderen kondigde 3 % aan vanaf 1 januari 2027 (Septemberverklaring 2026); het decreet was half november 2026 nog niet gestemd.',
    horizon: 'Periode',
    horizonUnit: 'jaar',
    prijs: 'Aankoopprijs',
    notaris: 'Notariskosten',
    notarisInfo: 'Ereloon, aktekosten en btw voor de aankoopakte, berekend uit de aankoopprijs volgens het wettelijke barema. U kunt het bedrag aanpassen; het springt terug wanneer u de prijs wijzigt. De kredietakte staat apart.',
    krediet: 'Kosten kredietakte',
    kredietInfo: 'De notariële akte van de hypothecaire lening: 1 % registratierecht en 0,3 % hypotheekrecht op het ingeschreven bedrag (de lening plus zo\'n 10 %), het ereloon van de notaris, vaste kosten en btw. Berekend uit het geleende bedrag zoals de rekenmodule van notaris.be; een verlaging die uw gewest geeft zit er niet in. U kunt het bedrag aanpassen.',
    inbreng: 'Eigen inbreng',
    inbrengInfo: 'In % van de aankoopprijs. De rest wordt geleend.',
    rente: 'Rentevoet lening',
    looptijd: 'Looptijd lening',
    enige: 'Enige eigen woning',
    enigeInfo: 'U koopt uw enige woning om er zelf te wonen. Dat geeft een verlaagd tarief of abattement op de registratierechten.',
    kernstad: 'Kernstad of Vlaamse Rand',
    kernstadInfo: 'Daar ligt de prijsgrens voor de vermindering voor een bescheiden woning hoger.',
    ov: 'Onroerende voorheffing',
    ovInfo: 'De belasting die u elk jaar betaalt op een woning die u bezit, berekend op het kadastraal inkomen. U vult ze hier in als % van de aankoopprijs; het bedrag staat op het aanslagbiljet van de woning. Het kadastraal inkomen wordt elk jaar geïndexeerd, dus de voorheffing stijgt mee.',
    kostengroei: 'Stijging eigenaarskosten',
    kostengroeiInfo: 'Hoeveel onroerende voorheffing, onderhoud en verzekering elk jaar stijgen. Het kadastraal inkomen en de brandverzekering worden geïndexeerd, en onderhoud volgt de prijzen; de inflatie is een goede schatting.',
    onderhoud: 'Onderhoud',
    verzekering: 'Brandverzekering',
    costInfo: 'Per jaar, in % van de aankoopprijs. In het eerste jaar; daarna stijgt het bedrag zoals hieronder ingevuld.',
    groei: 'Stijging huizenprijzen',
    verkoop: 'Verkoopkosten',
    groeiInfo: (nominal: string, real: string) =>
      `Per jaar, inflatie inbegrepen. ${nominal} is ${real} boven de inflatie die u hieronder invult.`,
    verkoopInfo: 'Makelaar en attesten, in % van de verkoopprijs. Telt mee in het vermogen van de koper.',
    huur: 'Huur per maand',
    index: 'Huurindexatie',
    indexInfo: 'Hoeveel de huur elk jaar stijgt.',
    mixInfo: 'Hoe de huurder belegt, en de koper wanneer die geld overhoudt.',
    mwb: 'Meerwaardebelasting',
    mwbInfo: 'Sinds 2026 betaalt u belasting op de winst wanneer u beleggingen verkoopt. Het model rekent ze op het belegde geld van huurder en koper, alsof het dat jaar verkocht wordt. De winst op een eigen woning is vrij van belasting.',
    vrijstelling: 'Vrijstelling per jaar',
    vrijstellingInfo: 'Winst tot dit bedrag is elk jaar vrijgesteld, in euro van vandaag; het stijgt mee met de inflatie.',
    inflatie: 'Inflatie',
    inflatieInfo: 'Dient alleen om bedragen om te rekenen naar euro van vandaag.',
    reeel: 'Toon bedragen in euro van vandaag',
  },

  notes: {
    title: 'Over dit model',
    how: 'De huurder belegt het geld dat de koper in de aankoop steekt: de eigen inbreng en de aankoopkosten. Wie daarna in een jaar minder aan wonen betaalt, belegt het verschil.',
    items: [
      'Elk jaar verloopt zoals verwacht: één vast rendement, één vaste stijging van de huizenprijzen. Echte jaren schommelen.',
      'Onroerende voorheffing, onderhoud en verzekering stijgen elk jaar met de stijging eigenaarskosten; de huur met de huurindexatie.',
      'Een schuldsaldoverzekering, dossier- en schattingskosten van de bank en fiscale voordelen op de lening zitten er niet in.',
      'Het rendement is na de kosten die u invult. Op het belegde geld rekent het model meerwaardebelasting, alsof het in dat jaar verkocht wordt; de eigen woning blijft vrij. Beurstaks en roerende voorheffing zitten er niet in: het model gaat uit van kapitaliserende fondsen.',
      'Het vermogen van de koper is wat overblijft na verkoop: de waarde van de woning, min de lening en de verkoopkosten.',
    ],
    verified: (date: string) =>
      `Tarieven registratierechten en notariskosten nagekeken op ${date}. De aankoopprijs geldt als heffingsgrondslag. De kosten van de kredietakte volgen de rekenmodule van notaris.be (2026).`,
    disclaimer: 'Algemene informatie, geen persoonlijk advies.',
    engine: 'De rekenregels zijn dezelfde als in mijn',
    engineLink: 'planningsmotor',
    engineTail: 'en worden ertegen getest.',
  },
};
