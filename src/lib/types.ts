export interface Position {
  id: string;
  ticker: string;
  name: string;
  qty: number;
  buyPrice: number;
  buyDate: string; // YYYY-MM-DD
}

export interface Quote {
  ticker: string;
  name: string;
  price: number;
  prevClose: number;
}

export type QuoteMap = Record<string, Quote>;

/** live : flux à jour • cache : derniers cours réels connus (flux injoignable) • error : aucun cours */
export type FeedMode = 'live' | 'cache' | 'loading' | 'error';

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  value: number;
  invested: number;
}

export interface IntradayPoint {
  t: number; // epoch ms
  value: number;
  invested: number;
}

export type Range = '1D' | '1W' | '1M' | 'YTD' | 'ALL';

export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export type PriceHistory = Record<string, PricePoint[]>;

/** Vente (totale ou partielle) d'une position : base de la plus-value réalisée */
export interface Sale {
  id: string;
  positionId: string;
  ticker: string;
  name: string;
  qty: number;
  buyPrice: number;
  sellPrice: number;
  date: string; // YYYY-MM-DD
  /** date d'achat de la position vendue (pour la recréer si la vente est annulée) */
  buyDate?: string;
}
