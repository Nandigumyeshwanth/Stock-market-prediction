// A selection of real stock data provided by the user.
// Ticker symbols are mapped to their respective data.

type RealStockInfo = {
  name: string;
  price: number;
  changePercent: number;
};

export const REAL_STOCK_DATA: Record<string, RealStockInfo> = {
  "RELIANCE": { name: "Reliance Industries Ltd.", price: 1516.00, changePercent: -0.20 },
  "HDFCBANK": { name: "HDFC Bank Ltd.", price: 2013.60, changePercent: 0.12 },
  "TCS": { name: "Tata Consultancy Services Ltd.", price: 3369.60, changePercent: -0.42 },
  "BHARTIARTL": { name: "Bharti Airtel Ltd.", price: 1970.20, changePercent: -2.45 },
  "ICICIBANK": { name: "ICICI Bank Ltd.", price: 1425.60, changePercent: -0.44 },
  "SBIN": { name: "State Bank of India", price: 809.05, changePercent: -0.23 },
  "INFY": { name: "Infosys Ltd.", price: 1611.60, changePercent: -1.35 },
  "BAJFINANCE": { name: "Bajaj Finance Ltd.", price: 947.30, changePercent: 0.71 },
  "LICI": { name: "Life Insurance Corporation of India", price: 928.75, changePercent: -1.82 },
  "HINDUNILVR": { name: "Hindustan Unilever Ltd.", price: 2410.70, changePercent: -0.52 },
  "ITC": { name: "ITC Ltd.", price: 418.05, changePercent: -0.33 },
  "LT": { name: "Larsen & Toubro Ltd.", price: 3578.70, changePercent: -0.03 },
  "HCLTECH": { name: "HCL Technologies Ltd.", price: 1663.70, changePercent: -0.62 },
  "KOTAKBANK": { name: "Kotak Mahindra Bank Ltd.", price: 2223.70, changePercent: -0.25 },
  "SUNPHARMA": { name: "Sun Pharmaceutical Industries Ltd.", price: 1662.20, changePercent: -0.43 },
  "MARUTI": { name: "Maruti Suzuki India Ltd.", price: 12646.00, changePercent: 1.41 },
  "M_AND_M": { name: "Mahindra & Mahindra Ltd.", price: 3162.90, changePercent: -0.42 },
  "ULTRACEMCO": { name: "UltraTech Cement Ltd.", price: 12573.00, changePercent: 0.09 },
  "AXISBANK": { name: "Axis Bank Ltd.", price: 1167.70, changePercent: 0.26 },
  "NTPC": { name: "NTPC Ltd.", price: 342.20, changePercent: -0.52 },
  "HAL": { name: "Hindustan Aeronautics Ltd.", price: 4906.20, changePercent: -2.02 },
  "BAJAJFINSV": { name: "Bajaj Finserv Ltd.", price: 2040.90, changePercent: 0.72 },
  "ADANIPORTS": { name: "Adani Ports & Special Economic Zone Ltd.", price: 1442.80, changePercent: -0.01 },
  "ONGC": { name: "Oil And Natural Gas Corporation Ltd.", price: 243.28, changePercent: -0.03 },
  "TITAN": { name: "Titan Company Ltd.", price: 3426.90, changePercent: -0.15 },
  "BEL": { name: "Bharat Electronics Ltd.", price: 412.65, changePercent: -1.20 },
  "ADANIENT": { name: "Adani Enterprises Ltd.", price: 2581.20, changePercent: -0.07 },
  "POWERGRID": { name: "Power Grid Corporation of India Ltd.", price: 298.40, changePercent: -0.42 },
  "WIPRO": { name: "Wipro Ltd.", price: 264.30, changePercent: -1.31 },
  "DMART": { name: "Avenue Supermarts Ltd.", price: 4183.00, changePercent: -0.19 },
  "TATAMOTORS": { name: "Tata Motors Ltd.", price: 692.50, changePercent: -0.04 },
  "JSWSTEEL": { name: "JSW Steel Ltd.", price: 1041.00, changePercent: 0.06 },
  "ETERNAL": { name: "Eternal Ltd.", price: 263.00, changePercent: -0.59 },
  "ASIANPAINT": { name: "Asian Paints Ltd.", price: 2478.20, changePercent: -0.83 },
  "COALINDIA": { name: "Coal India Ltd.", price: 383.70, changePercent: -0.97 },
};
