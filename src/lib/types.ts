export type Stock = {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

export type Holding = {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
};

export type ChartData = {
  date: string;
  price: number;
  prediction?: number;
};

export type Index = {
  name: string;
  value: string;
  change: string;
  changePercent: number;
};
