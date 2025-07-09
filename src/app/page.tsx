
"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MainLayout } from "@/components/main-layout";
import type { ChartData, Index, Stock } from "@/lib/types";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const indices: Index[] = [
  { name: "NIFTY 50", value: "23,537.85", change: "+66.70", changePercent: 0.28 },
  { name: "BSE SENSEX", value: "77,337.59", change: "+131.18", changePercent: 0.17 },
  { name: "NIFTY BANK", value: "51,703.95", change: "+385.20", changePercent: 0.75 },
];

const initialWatchlist: Stock[] = [
    { ticker: "RELIANCE", name: "Reliance Industries Ltd.", price: 2960.55, change: 51.10, changePercent: 1.76 },
    { ticker: "ADANIENT", name: "Adani Enterprises Ltd.", price: 3185.00, change: -25.50, changePercent: -0.79 },
    { ticker: "TCS", name: "Tata Consultancy Services", price: 3820.75, change: 15.20, changePercent: 0.40 },
    { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", price: 1711.25, change: 48.45, changePercent: 2.91 },
    { ticker: "INFY", name: "Infosys Ltd.", price: 1528.00, change: -5.75, changePercent: -0.37 },
    { ticker: "WIPRO", name: "Wipro Ltd.", price: 491.50, change: 2.75, changePercent: 0.56 },
    { ticker: "TATAMOTORS", name: "Tata Motors Ltd.", price: 988.70, change: -10.15, changePercent: -1.02 },
    { ticker: "ITC", name: "ITC Ltd.", price: 423.30, change: 1.50, changePercent: 0.36 },
    { ticker: "ICICIBANK", name: "ICICI Bank Ltd.", price: 1157.85, change: 25.40, changePercent: 2.24 },
    { ticker: "SBIN", name: "State Bank of India", price: 840.10, change: 7.90, changePercent: 0.95 },
];

const initialStockChartData: Record<string, ChartData[]> = {
  RELIANCE: [
    { date: "Jan", price: 2700, prediction: 2700 }, { date: "Feb", price: 2850, prediction: 2850 },
    { date: "Mar", price: 2900, prediction: 2900 }, { date: "Apr", price: 2950, prediction: 2950 },
    { date: "May", price: 3000, prediction: 3000 }, { date: "Jun", price: 2980, prediction: 2980 },
    { date: "Jul", price: 2950, prediction: 3050 }, { date: "Aug", price: undefined, prediction: 3100 },
    { date: "Sep", price: undefined, prediction: 3150 }, { date: "Oct", price: undefined, prediction: 3200 },
  ],
  ADANIENT: [
    { date: "Jan", price: 3000, prediction: 3000 }, { date: "Feb", price: 3050, prediction: 3050 },
    { date: "Mar", price: 3100, prediction: 3100 }, { date: "Apr", price: 3200, prediction: 3200 },
    { date: "May", price: 3150, prediction: 3150 }, { date: "Jun", price: 3185, prediction: 3185 },
    { date: "Jul", price: 3185, prediction: 3250 }, { date: "Aug", price: undefined, prediction: 3300 },
    { date: "Sep", price: undefined, prediction: 3280 }, { date: "Oct", price: undefined, prediction: 3350 },
  ],
  TCS: [
    { date: "Jan", price: 3700, prediction: 3700 }, { date: "Feb", price: 3750, prediction: 3750 },
    { date: "Mar", price: 3800, prediction: 3800 }, { date: "Apr", price: 3820, prediction: 3820 },
    { date: "May", price: 3850, prediction: 3850 }, { date: "Jun", price: 3830, prediction: 3830 },
    { date: "Jul", price: 3830, prediction: 3900 }, { date: "Aug", price: undefined, prediction: 3950 },
    { date: "Sep", price: undefined, prediction: 4000 }, { date: "Oct", price: undefined, prediction: 4050 },
  ],
  HDFCBANK: [
    { date: "Jan", price: 1600, prediction: 1600 }, { date: "Feb", price: 1620, prediction: 1620 },
    { date: "Mar", price: 1650, prediction: 1650 }, { date: "Apr", price: 1680, prediction: 1680 },
    { date: "May", price: 1700, prediction: 1700 }, { date: "Jun", price: 1711, prediction: 1711 },
    { date: "Jul", price: 1711, prediction: 1750 }, { date: "Aug", price: undefined, prediction: 1780 },
    { date: "Sep", price: undefined, prediction: 1800 }, { date: "Oct", price: undefined, prediction: 1820 },
  ],
  INFY: [
    { date: "Jan", price: 1450, prediction: 1450 }, { date: "Feb", price: 1480, prediction: 1480 },
    { date: "Mar", price: 1500, prediction: 1500 }, { date: "Apr", price: 1520, prediction: 1520 },
    { date: "May", price: 1530, prediction: 1530 }, { date: "Jun", price: 1528, prediction: 1528 },
    { date: "Jul", price: 1528, prediction: 1560 }, { date: "Aug", price: undefined, prediction: 1580 },
    { date: "Sep", price: undefined, prediction: 1600 }, { date: "Oct", price: undefined, prediction: 1610 },
  ],
  WIPRO: [
    { date: "Jan", price: 450, prediction: 450 }, { date: "Feb", price: 460, prediction: 460 },
    { date: "Mar", price: 475, prediction: 475 }, { date: "Apr", price: 480, prediction: 480 },
    { date: "May", price: 485, prediction: 485 }, { date: "Jun", price: 491, prediction: 491 },
    { date: "Jul", price: 491, prediction: 500 }, { date: "Aug", price: undefined, prediction: 510 },
    { date: "Sep", price: undefined, prediction: 515 }, { date: "Oct", price: undefined, prediction: 520 },
  ],
  TATAMOTORS: [
    { date: "Jan", price: 900, prediction: 900 }, { date: "Feb", price: 920, prediction: 920 },
    { date: "Mar", price: 950, prediction: 950 }, { date: "Apr", price: 970, prediction: 970 },
    { date: "May", price: 1000, prediction: 1000 }, { date: "Jun", price: 988, prediction: 988 },
    { date: "Jul", price: 988, prediction: 1010 }, { date: "Aug", price: undefined, prediction: 1025 },
    { date: "Sep", price: undefined, prediction: 1040 }, { date: "Oct", price: undefined, prediction: 1050 },
  ],
  ITC: [
    { date: "Jan", price: 400, prediction: 400 }, { date: "Feb", price: 410, prediction: 410 },
    { date: "Mar", price: 415, prediction: 415 }, { date: "Apr", price: 420, prediction: 420 },
    { date: "May", price: 425, prediction: 425 }, { date: "Jun", price: 423, prediction: 423 },
    { date: "Jul", price: 423, prediction: 430 }, { date: "Aug", price: undefined, prediction: 435 },
    { date: "Sep", price: undefined, prediction: 440 }, { date: "Oct", price: undefined, prediction: 445 },
  ],
  ICICIBANK: [
    { date: "Jan", price: 1050, prediction: 1050 }, { date: "Feb", price: 1080, prediction: 1080 },
    { date: "Mar", price: 1100, prediction: 1100 }, { date: "Apr", price: 1120, prediction: 1120 },
    { date: "May", price: 1140, prediction: 1140 }, { date: "Jun", price: 1157, prediction: 1157 },
    { date: "Jul", price: 1157, prediction: 1180 }, { date: "Aug", price: undefined, prediction: 1200 },
    { date: "Sep", price: undefined, prediction: 1210 }, { date: "Oct", price: undefined, prediction: 1225 },
  ],
  SBIN: [
    { date: "Jan", price: 780, prediction: 780 }, { date: "Feb", price: 790, prediction: 790 },
    { date: "Mar", price: 800, prediction: 800 }, { date: "Apr", price: 815, prediction: 815 },
    { date: "May", price: 830, prediction: 830 }, { date: "Jun", price: 840, prediction: 840 },
    { date: "Jul", price: 840, prediction: 850 }, { date: "Aug", price: undefined, prediction: 860 },
    { date: "Sep", price: undefined, prediction: 875 }, { date: "Oct", price: undefined, prediction: 890 },
  ],
};

const generateMockStockData = (ticker: string): { stock: Stock, chartData: ChartData[] } => {
  const formattedName = ticker.charAt(0).toUpperCase() + ticker.slice(1).toLowerCase();
  const price = Math.random() * 4000 + 500;
  const change = (Math.random() - 0.5) * 100;
  const changePercent = (change / price) * 100;

  const stock: Stock = {
    ticker,
    name: `${formattedName} Ltd.`,
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
  };

  const chartData: ChartData[] = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  let currentPrice = price - change * 3;

  for (const month of months) {
    const isFuture = months.indexOf(month) > 5;
    const priceFluctuation = (Math.random() - 0.4) * 150;
    currentPrice += priceFluctuation;
    
    if (!isFuture) {
      chartData.push({ date: month, price: parseFloat(currentPrice.toFixed(2)), prediction: parseFloat(currentPrice.toFixed(2)) });
    } else {
      const lastPrediction = chartData[chartData.length - 1].prediction!;
      const predictionFluctuation = (Math.random() - 0.4) * 180;
      const predictionPrice = lastPrediction + predictionFluctuation;
      chartData.push({ date: month, price: undefined, prediction: parseFloat(predictionPrice.toFixed(2)) });
    }
  }
  chartData[6].price = chartData[5].price;

  return { stock, chartData };
};

function Dashboard() {
  const searchParams = useSearchParams();
  const [watchlist, setWatchlist] = useState<Stock[]>(initialWatchlist);
  const [stockChartData, setStockChartData] = useState<Record<string, ChartData[]>>(initialStockChartData);
  const [selectedStock, setSelectedStock] = useState<Stock>(watchlist[0]);
  const graphCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticker = searchParams.get('ticker');
    if (ticker) {
      const existingStock = watchlist.find(s => s.ticker === ticker);
      
      if (existingStock) {
        setSelectedStock(existingStock);
      } else {
        const { stock: newStock, chartData: newChartData } = generateMockStockData(ticker);
        
        setWatchlist(prev => [newStock, ...prev.filter(s => s.ticker !== ticker)]);
        setStockChartData(prev => ({ ...prev, [ticker]: newChartData }));
        setSelectedStock(newStock);
      }
      graphCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setSelectedStock(watchlist[0]);
    }
  }, [searchParams, watchlist]);

  const currentChartData = stockChartData[selectedStock.ticker] || [];

  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="grid gap-4 md:grid-cols-3">
          {indices.map((index) => (
            <Card key={index.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{index.name}</CardTitle>
                {index.changePercent >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{index.value}</div>
                <p className={cn(
                  "text-xs",
                  index.changePercent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {index.change} ({index.changePercent.toFixed(2)}%)
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card ref={graphCardRef}>
          <CardHeader>
            <CardTitle>{selectedStock.ticker} - {selectedStock.name} Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                <XAxis dataKey="date" />
                <YAxis domain={['dataMin - 100', 'dataMax + 100']} tickFormatter={(value) => `₹${value}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">Date</span>
                              <span className="font-bold text-muted-foreground">{label}</span>
                            </div>
                            {payload.map((item) => (
                              item.value &&
                              <div key={item.dataKey} className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">{item.name}</span>
                                <span className="font-bold" style={{color: item.color}}>₹{item.value?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null;
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="price" name="Price" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPrice)" connectNulls={false}/>
                <Area type="monotone" dataKey="prediction" name="Prediction" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorPrediction)" strokeDasharray="5 5"/>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map((stock) => (
                  <TableRow 
                    key={stock.ticker}
                    onClick={() => setSelectedStock(stock)}
                    className="cursor-pointer"
                    data-state={selectedStock.ticker === stock.ticker ? "selected" : "unselected"}
                  >
                    <TableCell>
                      <Badge variant="outline">{stock.ticker}</Badge>
                    </TableCell>
                    <TableCell>{stock.name}</TableCell>
                    <TableCell className="text-right font-medium">₹{stock.price.toFixed(2)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        stock.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// Wrap the page in a Suspense boundary to allow useSearchParams to work with static rendering.
export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="h-[350px] w-full p-2">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-8 w-32" /></CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
