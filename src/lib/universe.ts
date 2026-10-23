export interface Instrument {
  ticker: string;
  name: string;
  sector: string;
  /** Cours de référence indicatif (MAD), utilisé en mode démo / premier chargement */
  ref: number;
}

export const UNIVERSE: Instrument[] = [
  { ticker: 'ATW', name: 'Attijariwafa Bank', sector: 'Banques', ref: 690 },
  { ticker: 'BCP', name: 'Banque Centrale Populaire', sector: 'Banques', ref: 292 },
  { ticker: 'BOA', name: 'Bank of Africa', sector: 'Banques', ref: 215 },
  { ticker: 'CIH', name: 'CIH Bank', sector: 'Banques', ref: 410 },
  { ticker: 'CDM', name: 'Crédit du Maroc', sector: 'Banques', ref: 920 },
  { ticker: 'IAM', name: 'Itissalat Al-Maghrib (Maroc Telecom)', sector: 'Télécoms', ref: 98 },
  { ticker: 'TGC', name: 'TGCC', sector: 'BTP', ref: 780 },
  { ticker: 'GTM', name: 'SGTM', sector: 'BTP', ref: 610 },
  { ticker: 'RIS', name: 'Risma', sector: 'Tourisme', ref: 245 },
  { ticker: 'CDA', name: 'Centrale Danone', sector: 'Agroalimentaire', ref: 590 },
  { ticker: 'JET', name: 'Jet Contractors', sector: 'BTP', ref: 2050 },
  { ticker: 'TMA', name: 'TotalEnergies Marketing Maroc', sector: 'Distribution pétrolière', ref: 1890 },
  { ticker: 'TQM', name: 'Taqa Morocco', sector: 'Énergie', ref: 1320 },
  { ticker: 'LHM', name: 'LafargeHolcim Maroc', sector: 'Matériaux', ref: 1960 },
  { ticker: 'CMA', name: 'Ciments du Maroc', sector: 'Matériaux', ref: 1880 },
  { ticker: 'SID', name: 'Sonasid', sector: 'Matériaux', ref: 1750 },
  { ticker: 'MNG', name: 'Managem', sector: 'Mines', ref: 4100 },
  { ticker: 'CSR', name: 'Cosumar', sector: 'Agroalimentaire', ref: 198 },
  { ticker: 'MUT', name: 'Mutandis', sector: 'Agroalimentaire', ref: 255 },
  { ticker: 'LBV', name: "Label'Vie", sector: 'Distribution', ref: 4450 },
  { ticker: 'MSA', name: 'Marsa Maroc', sector: 'Transport', ref: 660 },
  { ticker: 'HPS', name: 'HPS', sector: 'Technologie', ref: 610 },
  { ticker: 'AKT', name: 'Akdital', sector: 'Santé', ref: 1150 },
  { ticker: 'ADH', name: 'Douja Prom Addoha', sector: 'Immobilier', ref: 36 },
  { ticker: 'ADI', name: 'Alliances Développement Immobilier', sector: 'Immobilier', ref: 520 },
  { ticker: 'RDS', name: 'Résidences Dar Saada', sector: 'Immobilier', ref: 205 },
  { ticker: 'WAA', name: 'Wafa Assurance', sector: 'Assurances', ref: 4850 },
  { ticker: 'ATL', name: 'AtlantaSanad', sector: 'Assurances', ref: 142 },
  { ticker: 'DHO', name: 'Delta Holding', sector: 'Holdings', ref: 62 },
  { ticker: 'SBM', name: 'Société des Boissons du Maroc', sector: 'Boissons', ref: 1720 },
];

export const UNIVERSE_MAP: Record<string, Instrument> = Object.fromEntries(
  UNIVERSE.map((i) => [i.ticker, i]),
);
