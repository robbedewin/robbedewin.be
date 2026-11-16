// All Dutch text of /tools/risicoprofiel. Amounts are written as {1000} and
// formatted as euro at run time; no euro amount is written out here.
//
// The tolerance questions are a Dutch translation of the 13-item scale of
// Grable & Lytton (1999), with the amounts in euro and the products renamed
// to their Belgian equivalents. The order of the options is the order of the
// scoring key in src/lib/riskprofile.ts; do not reorder them.
export const t = {
  title: 'Risicoprofiel',
  description:
    'Hoeveel beleggingsrisico wilt u dragen, en hoeveel kunt u dragen? Een vragenlijst over risicotolerantie en een toets van uw risicocapaciteit.',
  summary: 'Hoeveel risico u wilt nemen en hoeveel u kunt dragen zijn twee aparte vragen. Het laagste van de twee bepaalt de mix.',

  steps: {
    tolerance: 'Risicotolerantie',
    behaviour: 'Gedrag',
    capacity: 'Risicocapaciteit',
    done: (n: number, of: number) => `${n} van ${of}`,
    question: (n: number, of: number) => `Vraag ${n} van ${of}`,
    previous: 'Vorige',
    next: 'Volgende',
    progress: 'Voortgang',
    toleranceIntro: 'Hoe een daling voor u aanvoelt. Kies telkens het antwoord dat het best bij u past.',
    behaviourIntro: 'Wat u in de praktijk doet. Deze antwoorden veranderen de mix niet, maar tonen waar het mis kan gaan.',
    capacityIntro: 'Wat uw situatie toelaat, los van hoe u zich erbij voelt.',
  },

  tolerance: [
    {
      q: 'Hoe zou uw beste vriend u omschrijven als het over risico nemen gaat?',
      a: ['Een echte gokker', 'Bereid risico te nemen na grondig uitzoekwerk', 'Voorzichtig', 'Iemand die risico uit de weg gaat'],
    },
    {
      q: 'U doet mee aan een tv-quiz en mag één van deze opties kiezen. Welke neemt u?',
      a: ['{1000} cash', '50 % kans op {5000}', '25 % kans op {10000}', '5 % kans op {100000}'],
    },
    {
      q: 'U hebt net gespaard voor de reis van uw leven. Drie weken voor vertrek verliest u uw job. Wat doet u?',
      a: [
        'De reis annuleren',
        'Een veel bescheidener reis maken',
        'Vertrekken zoals gepland: u hebt de tijd nodig om u voor te bereiden op het zoeken naar werk',
        'De reis verlengen: dit is misschien uw laatste kans om eersteklas te reizen',
      ],
    },
    {
      q: 'U krijgt onverwacht {20000} om te beleggen. Wat doet u?',
      a: [
        'Op een spaarrekening of termijnrekening zetten',
        'Beleggen in veilige obligaties van hoge kwaliteit of in obligatiefondsen',
        'Beleggen in aandelen of aandelenfondsen',
      ],
    },
    {
      q: 'Hoe comfortabel voelt u zich, op basis van uw ervaring, bij beleggen in aandelen of aandelenfondsen?',
      a: ['Helemaal niet comfortabel', 'Redelijk comfortabel', 'Zeer comfortabel'],
    },
    {
      q: 'Aan welk woord denkt u het eerst bij het woord "risico"?',
      a: ['Verlies', 'Onzekerheid', 'Kans', 'Spanning'],
    },
    {
      q: 'Sommige experts voorspellen dat goud, juwelen, verzamelobjecten en vastgoed in waarde zullen stijgen. Obligaties kunnen in prijs dalen, maar staatsobligaties gelden als vrij veilig. Het grootste deel van uw beleggingen zit nu in staatsobligaties met een hoge rente. Wat doet u?',
      a: [
        'De obligaties houden',
        'De obligaties verkopen, de helft op een spaarrekening zetten en de andere helft in goud, vastgoed en dergelijke steken',
        'De obligaties verkopen en alles in goud, vastgoed en dergelijke steken',
        'De obligaties verkopen, alles in goud, vastgoed en dergelijke steken en geld bijlenen om meer te kopen',
      ],
    },
    {
      q: 'Hieronder staan vier beleggingen met hun beste en hun slechtste uitkomst. Welke verkiest u?',
      a: [
        'Beste geval {200} winst; slechtste geval winst noch verlies',
        'Beste geval {800} winst; slechtste geval {200} verlies',
        'Beste geval {2600} winst; slechtste geval {800} verlies',
        'Beste geval {4800} winst; slechtste geval {2400} verlies',
      ],
    },
    {
      q: 'U krijgt {1000} bovenop wat u al bezit. Daarna moet u kiezen tussen:',
      a: ['Een zekere winst van {500}', '50 % kans op {1000} winst en 50 % kans op niets'],
    },
    {
      q: 'U krijgt {2000} bovenop wat u al bezit. Daarna moet u kiezen tussen:',
      a: ['Een zeker verlies van {500}', '50 % kans op {1000} verlies en 50 % kans op geen verlies'],
    },
    {
      q: 'Een familielid laat u {100000} na, op voorwaarde dat u alles in één van deze keuzes belegt. Welke kiest u?',
      a: [
        'Een spaarrekening of geldmarktfonds',
        'Een gemengd fonds met aandelen en obligaties',
        'Een portefeuille van 15 aandelen',
        'Grondstoffen zoals goud, zilver en olie',
      ],
    },
    {
      q: 'Als u {20000} moest beleggen, welke verdeling spreekt u het meest aan?',
      a: [
        '60 % laag risico, 30 % gemiddeld risico, 10 % hoog risico',
        '30 % laag risico, 40 % gemiddeld risico, 30 % hoog risico',
        '10 % laag risico, 40 % gemiddeld risico, 50 % hoog risico',
      ],
    },
    {
      q: 'Een buur en goede vriend, een ervaren geoloog, zoekt beleggers voor een proefboring naar goud. Bij succes levert dat 50 tot 100 keer de inleg op; mislukt het, dan is de inleg volledig weg. Uw vriend schat de kans op succes op 20 %. Hoeveel zou u inleggen, als u het geld had?',
      a: ['Niets', 'Eén maandloon', 'Drie maandlonen', 'Zes maandlonen'],
    },
  ],

  // Own questions, not part of the scale. `note` is shown for the answers
  // listed in `flag` (indexes into `a`).
  behaviour: [
    {
      q: 'Uw beleggingen verliezen in enkele maanden 30 % van hun waarde. Wat doet u?',
      a: ['Alles verkopen', 'Een deel verkopen', 'Niets', 'Bijkopen'],
      flag: [0, 1],
      note: 'Verkopen in een daling maakt van een tijdelijk verlies een definitief verlies. Daarom staat de mix een band lager: kies er een waarbij u zo\'n daling kunt uitzitten.',
    },
    {
      q: 'Hoe vaak bekijkt u de waarde van uw beleggingen?',
      a: ['Elke dag', 'Elke week', 'Elke maand', 'Een paar keer per jaar of minder'],
      flag: [0, 1],
      note: 'Wie vaak kijkt, ziet vaker een verlies en grijpt sneller in. Minder vaak kijken is een van de eenvoudigste manieren om koers te houden.',
    },
    {
      q: 'Een aandeel of thema is het voorbije jaar sterk gestegen en iedereen heeft het erover. Wat doet u?',
      a: ['Instappen voor het te laat is', 'Een klein bedrag inleggen', 'Bij mijn plan blijven'],
      flag: [0],
      note: 'Instappen na een sterke stijging is kopen wanneer het duur is. Een vaste verdeling die u af en toe herstelt, doet het omgekeerde.',
    },
    {
      q: 'Hebt u ooit tijdens een daling met verlies verkocht?',
      a: ['Ja', 'Nee, ik bleef zitten', 'Ik heb nog geen grote daling meegemaakt'],
      flag: [0, 2],
      note: '',
    },
  ],
  behaviourNotes: {
    soldBefore: 'U verkocht al eens met verlies in een daling. Wat u toen deed zegt meer dan wat u nu antwoordt; neem dat mee in uw keuze.',
    untested: 'U hebt nog geen grote daling meegemaakt. De vragenlijst meet dan wat u denkt te zullen doen; begin gerust aan de voorzichtige kant van de vork.',
    mismatch: 'Uw antwoorden op de vragenlijst wijzen op een hoge tolerantie, maar bij een daling van 30 % zou u verkopen. Wat u doet weegt zwaarder dan wat u denkt.',
    none: 'Uw antwoorden wijzen niet op een van de klassieke valkuilen.',
    title: 'Aandachtspunten in uw gedrag',
  },

  capacity: {
    horizon: 'Beleggingshorizon',
    horizonUnit: 'jaar',
    horizonInfo: 'Het aantal jaren tot u het grootste deel van dit geld nodig hebt.',
    stability: 'Hoe zeker is uw inkomen?',
    stabilityOptions: { hoog: 'Zeer zeker', matig: 'Redelijk zeker', laag: 'Onzeker' },
    stabilityInfo: 'Zeer zeker: bijvoorbeeld een vaste benoeming of een pensioen. Onzeker: sterk wisselende inkomsten of een job die op de helling staat.',
    income: 'Netto-inkomen per maand',
    costs: 'Vaste lasten per maand',
    costsInfo: 'Huur of lening, nutsvoorzieningen, verzekeringen, vervoer, boodschappen. Laat inkomen en lasten leeg als u ze niet wilt invullen; de marge telt dan niet mee.',
  },

  result: {
    title: 'Uw profiel',
    tolerance: 'Risicotolerantie',
    capacity: 'Risicocapaciteit',
    pendingTolerance: (n: number) => (n === 1 ? 'nog 1 vraag' : `nog ${n} vragen`),
    pendingCapacity: 'vul horizon en inkomenszekerheid in',
    score: (score: number, min: number, max: number) => `${score} punten op een schaal van ${min} tot ${max}`,
    levels: ['Laag', 'Onder gemiddeld', 'Gemiddeld', 'Boven gemiddeld', 'Hoog'],
    capacities: { beperkt: 'Beperkt', gemiddeld: 'Gemiddeld', ruim: 'Ruim' },
    factors: {
      horizon: (years: number, limit: number) => `de horizon is ${years} jaar (onder ${limit} jaar)`,
      margeNegative: 'de vaste lasten zijn hoger dan het inkomen',
      marge: (pct: string, limit: string) => `er blijft ${pct} van het inkomen over (onder ${limit})`,
      stabiliteit: 'het inkomen is onzeker',
    },
    heldBack: (what: string) => `Niet ruim omdat ${what}.`,
    roomy: 'Lange horizon, voldoende zeker inkomen en genoeg marge: een diepe daling kunt u uitzitten.',
    mixTitle: 'Mix die bij beide past',
    mixPending: 'Vul de vragenlijst en de capaciteit in om de mix te zien.',
    mix: (lo: number, hi: number) => `${lo} tot ${hi} % aandelen`,
    mixRest: (lo: number, hi: number) => `en ${100 - hi} tot ${100 - lo} % obligaties`,
    decidedBy: {
      both: 'Tolerantie en capaciteit wijzen dezelfde kant op.',
      capacity: 'Uw capaciteit is hier de rem: uw tolerantie zou meer aandelen toelaten.',
      tolerance: 'Uw tolerantie is hier de rem: uw capaciteit zou meer aandelen toelaten.',
    },
    gridTitle: 'Tolerantie tegenover capaciteit',
    gridLabel: 'Tabel met het aandeel aandelen voor elke combinatie van risicotolerantie en risicocapaciteit; uw combinatie is gemarkeerd.',
    gridCell: (lo: number, hi: number) => `${lo}–${hi} %`,
    limits: {
      kort: (years: number) =>
        `U hebt het geld binnen ${years} jaar nodig. Dan hoort het nauwelijks in aandelen, wat de rest van de test ook zegt.`,
      gedrag: 'Eén band lager dan tolerantie en capaciteit samen toelaten, omdat u bij een daling van 30 % zou verkopen.',
    },
    need: 'Een derde vraag is hoeveel risico u nodig hebt. Haalt u uw doel ook met minder aandelen, dan hoeft u niet meer risico te nemen dan dat.',
    pension: (pct: number) => `Reken uw pensioen door met ${pct} % aandelen`,
    rentbuy: (pct: number) => `Reken huren of kopen door met ${pct} % aandelen`,
    reset: 'Opnieuw beginnen',
    copy: 'Kopieer link',
    copied: 'Link gekopieerd',
  },

  about: {
    title: 'Over deze test',
    items: [
      'De 13 vragen over risicotolerantie zijn een vertaling van de schaal van Grable en Lytton (1999), "Financial risk tolerance revisited: the development of a risk assessment instrument", Financial Services Review 8, 163–181. De bedragen staan in euro en de producten kregen hun Belgische naam. De Engelse schaal is gevalideerd; deze vertaling is dat niet.',
      'De vier vragen over gedrag zijn van mezelf en tellen niet mee in de score.',
      'De capaciteit volgt de regel uit mijn planningsmotor: beperkt bij een horizon onder 5 jaar, lasten boven het inkomen, of een onzeker inkomen met een horizon onder 10 jaar. Ruim vraagt minstens 15 jaar, een voldoende zeker inkomen en een marge van minstens 10 % van het inkomen.',
      'De mix is een afspraak van deze pagina: elk niveau van tolerantie staat voor een vork van 20 procentpunten aandelen, en de capaciteit legt er een plafond op (40 % bij beperkt, 80 % bij gemiddeld). Twee regels komen erbovenop: wie het geld binnen 3 jaar nodig heeft, krijgt hoogstens 20 %, en wie bij een daling van 30 % zou verkopen, krijgt een band minder.',
      'Uw antwoorden blijven in uw browser; er gaat niets naar een server. De adresbalk houdt uw antwoorden bij, zodat ze een herladen overleven. Uw inkomen en vaste lasten komen alleen in de link als u op Kopieer link klikt.',
    ],
    disclaimer: 'Algemene informatie, geen persoonlijk advies. De test noemt geen producten en vervangt geen gesprek met een adviseur.',
  },
};
