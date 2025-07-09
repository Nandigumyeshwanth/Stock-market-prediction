
"use client";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
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
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getStockData } from "@/ai/flows/stock-flow";
import { useToast } from "@/hooks/use-toast";

const indices: Index[] = [
  { name: "NIFTY 50", value: "23,537.85", change: "+66.70", changePercent: 0.28 },
  { name: "BSE SENSEX", value: "77,337.59", change: "+131.18", changePercent: 0.17 },
  { name: "NIFTY BANK", value: "51,703.95", change: "+385.20", changePercent: 0.75 },
];

const initialWatchlist: Stock[] = [
    { ticker: "RELIANCE", name: "Reliance Industries Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "ADANIENT", name: "Adani Enterprises Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "TCS", name: "Tata Consultancy Services", price: 0, change: 0, changePercent: 0 },
    { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "INFY", name: "Infosys Ltd.", price: 0, change: 0, changePercent: 0 },
];

function Dashboard() {
  const searchParams = useSearchParams();
  const [watchlist, setWatchlist] = useState<Stock[]>(initialWatchlist);
  const [stockChartData, setStockChartData] = useState<Record<string, ChartData[]>>({});
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchStockData = useCallback(async (ticker: string) => {
    setIsLoading(true);
    if (graphCardRef.current) {
        graphCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
        const { stock, chartData } = await getStockData({ ticker: ticker.toUpperCase() });

        setWatchlist(prev => {
            const existing = prev.find(s => s.ticker === stock.ticker);
            if (existing) {
                return prev.map(s => s.ticker === stock.ticker ? stock : s);
            }
            // To prevent the list from growing indefinitely, let's cap it
            const newList = [stock, ...prev];
            return newList.slice(0, 10);
        });

        setStockChartData(prev => ({ ...prev, [stock.ticker]: chartData }));
        setSelectedStock(stock);
    } catch (error) {
        console.error("Failed to fetch stock data:", error);
        toast({
            title: "Error",
            description: `Could not fetch data for ${ticker}. Please try another stock.`,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const ticker = searchParams.get('ticker');
    fetchStockData(ticker || "RELIANCE");
  }, [searchParams, fetchStockData]);

  const currentChartData = selectedStock ? stockChartData[selectedStock.ticker] : [];

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
            {isLoading || !selectedStock ? (
                <Skeleton className="h-8 w-1/2" />
            ) : (
                <CardTitle>{selectedStock.ticker} - {selectedStock.name} Performance</CardTitle>
            )}
          </CardHeader>
          <CardContent className="h-[350px] w-full p-2">
           {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-4">Loading realistic stock data...</p>
                </div>
            ) : (
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
            )}
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
                    onClick={() => fetchStockData(stock.ticker)}
                    className="cursor-pointer"
                    data-state={selectedStock?.ticker === stock.ticker ? "selected" : "unselected"}
                  >
                    <TableCell>
                      <Badge variant="outline">{stock.ticker}</Badge>
                    </TableCell>
                    <TableCell>{stock.name}</TableCell>
                    <TableCell className="text-right font-medium">
                        {stock.price > 0 ? `₹${stock.price.toFixed(2)}` : <Skeleton className="h-4 w-20 ml-auto" />}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        stock.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {stock.price > 0 ? (
                        `${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)`
                      ) : (
                        <Skeleton className="h-4 w-24 ml-auto" />
                      )}
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
