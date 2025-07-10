
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
import type { Stock, ChartData } from "@/lib/types";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getStockChartData, getStockInfo } from "@/ai/flows/stock-flow";
import { Button } from "@/components/ui/button";
import withAuth from "@/components/with-auth";


type StockData = {
  stock: Stock;
  chartData: ChartData[];
};

const initialWatchlistTickers: string[] = [
    "RELIANCE",
    "HDFCBANK",
    "TCS",
    "M_AND_M",
    "ICICIBANK",
];

type StockDetailsState = Partial<StockData>;

function Dashboard() {
  const searchParams = useSearchParams();
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [stockDetails, setStockDetails] = useState<Record<string, StockDetailsState>>({});
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [stockToAdd, setStockToAdd] = useState<Stock | null>(null);
  const [isGraphLoading, setIsGraphLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const graphCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getChartDomain = (data: StockData['chartData'] = []): [number, number] => {
    if (data.length === 0) {
      return [0, 100]; // Default domain if no data
    }
    
    const values = data.flatMap(d => [d.price, d.prediction])
                       .filter(v => typeof v === 'number') as number[];

    if (values.length === 0) {
      return [0, 100];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const padding = (max - min) * 0.1 || 10;

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  };

  const selectedStockData = selectedTicker ? stockDetails[selectedTicker] : null;
  const selectedStock = selectedStockData?.stock;
  const currentChartData = selectedStockData?.chartData || [];
  const chartDomain = getChartDomain(currentChartData);

  const confirmAddToWatchlist = () => {
    if (stockToAdd) {
        setWatchlist(prev => [stockToAdd, ...prev]);
        setStockDetails(prev => ({...prev, [stockToAdd.ticker]: { stock: stockToAdd }}));
        setStockToAdd(null);
        toast({
            title: "Stock Added",
            description: `${stockToAdd.ticker} has been added to your watchlist.`,
        });
    }
  };

  const cancelAddToWatchlist = () => {
    setStockToAdd(null);
  };
  
  const handleStockSelection = useCallback(async (ticker: string) => {
    const upperTicker = ticker.toUpperCase().replace(/\s|&/g, (match) => (match === '&' ? '_AND_' : ''));
    setSelectedTicker(upperTicker);

    if (graphCardRef.current) {
        graphCardRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    if (!stockDetails[upperTicker]?.chartData) {
        setIsGraphLoading(true);
        try {
            let stockInfo = stockDetails[upperTicker]?.stock;
            if (!stockInfo) {
                stockInfo = await getStockInfo({ ticker: upperTicker });
                if (!stockInfo) throw new Error("Stock info not found.");
                setStockDetails(prev => ({ ...prev, [upperTicker]: { ...prev[upperTicker], stock: stockInfo } }));
            }
            
            const chartData = await getStockChartData({ ticker: upperTicker, price: stockInfo.price });
            setStockDetails(prev => ({ ...prev, [upperTicker]: { ...prev[upperTicker], chartData } }));

            if (!watchlist.some(s => s.ticker === upperTicker)) {
                setStockToAdd(stockInfo);
            }

        } catch (error) {
            console.error(`Failed to fetch chart data for ${upperTicker}:`, error);
            toast({
                title: "API Error",
                description: `Could not fetch chart data for ${upperTicker}.`,
                variant: "destructive",
            });
        } finally {
            setIsGraphLoading(false);
        }
    }
  }, [stockDetails, toast, watchlist]);


  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadComplete) return;

      try {
        const stockInfos = await Promise.all(
          initialWatchlistTickers.map(ticker => getStockInfo({ ticker }))
        );
        
        const validStocks = stockInfos.filter((s): s is Stock => s !== null);

        const newDetails: Record<string, StockDetailsState> = {};
        validStocks.forEach(stock => {
            newDetails[stock.ticker] = { stock };
        });
        
        setStockDetails(newDetails);
        setWatchlist(validStocks);
        
        const firstTicker = validStocks[0]?.ticker;
        if (firstTicker) {
            handleStockSelection(firstTicker);
        } else {
            setIsGraphLoading(false);
        }
      } catch (error) {
        console.error("Failed to load initial watchlist:", error);
        toast({
          title: "API Error",
          description: "Could not load initial watchlist data. Please refresh.",
          variant: "destructive",
        });
        setIsGraphLoading(false);
      } finally {
        setInitialLoadComplete(true);
      }
    };

    loadInitialData();
  }, [initialLoadComplete, toast, handleStockSelection]);
  
    useEffect(() => {
    const searchTicker = searchParams.get('ticker')?.toUpperCase().replace(/\s|&/g, (match) => (match === '&' ? '_AND_' : ''));
    if (searchTicker && initialLoadComplete && searchTicker !== selectedTicker) {
      handleStockSelection(searchTicker);
    }
  }, [searchParams, initialLoadComplete, selectedTicker, handleStockSelection]);


  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your Infinytix dashboard.</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/60 hover:border-primary/80 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">NIFTY 50</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23,537.85</div>
              <p className="text-xs font-semibold text-green-500">+66.70 (0.28%)</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 hover:border-primary/80 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">BSE SENSEX</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">77,337.59</div>
              <p className="text-xs font-semibold text-green-500">+131.18 (0.17%)</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 hover:border-primary/80 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">NIFTY BANK</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">51,703.95</div>
              <p className="text-xs font-semibold text-green-500">+385.20 (0.75%)</p>
            </CardContent>
          </Card>
        </div>

        <Card ref={graphCardRef} className="border-border/60">
          <CardHeader>
            {isGraphLoading && !selectedStock ? (
                <Skeleton className="h-8 w-1/2 rounded-md bg-muted/50" />
            ) : (
                <CardTitle className="text-xl">{selectedStock?.ticker} - {selectedStock?.name} Performance</CardTitle>
            )}
          </CardHeader>
          <CardContent className="h-[350px] w-full p-2">
           {isGraphLoading || currentChartData.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-4">Loading stock data...</p>
                </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="date" />
                <YAxis domain={chartDomain} tickFormatter={(value) => `₹${value.toFixed(0)}`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-2.5 shadow-lg">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="flex flex-col col-span-2 mb-1">
                              <span className="text-xs uppercase text-muted-foreground">Date</span>
                              <span className="font-bold text-foreground">{label}</span>
                            </div>
                            {payload.map((item) => (
                              item.value &&
                              <div key={item.dataKey} className="flex flex-col">
                                <span className="text-xs uppercase" style={{color: item.color}}>{item.name}</span>
                                <span className="font-bold" style={{color: item.color}}>₹{item.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <Area type="monotone" dataKey="price" name="Price" strokeWidth={2} stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorPrice)" />
                <Area type="monotone" dataKey="prediction" name="Prediction" strokeWidth={2} stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorPrediction)" strokeDasharray="5 5"/>
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {stockToAdd && (
            <Card className="border-border/60 bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>Do you want to add <Badge variant="outline">{stockToAdd.ticker}</Badge> to the watchlist?</div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={cancelAddToWatchlist}>No</Button>
                        <Button size="sm" onClick={confirmAddToWatchlist}>Yes, Add</Button>
                    </div>
                </CardContent>
            </Card>
        )}

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Watchlist</CardTitle>
            <CardDescription>Your curated list of top stocks to watch.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead>Ticker</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.length > 0 ? watchlist.map((stock) => (
                  <TableRow 
                    key={stock.ticker}
                    className="transition-colors border-border/20 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleStockSelection(stock.ticker)}
                  >
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{stock.ticker}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{stock.name}</TableCell>
                    <TableCell className="text-right font-medium">
                        {`₹${stock.price.toFixed(2)}`}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                         stock.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {`${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)`}
                    </TableCell>
                  </TableRow>
                )) : (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border/20">
                      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48 rounded-md" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-20 float-right rounded-md" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 float-right rounded-md" /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// Wrap the page in a Suspense boundary to allow useSearchParams to work with static rendering.
const AuthenticatedDashboard = withAuth(Dashboard);

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedDashboard />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your Infinytix dashboard.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card><CardHeader><Skeleton className="h-6 w-24 rounded-md" /></CardHeader><CardContent><Skeleton className="h-8 w-32 rounded-md" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-24 rounded-md" /></CardHeader><CardContent><Skeleton className="h-8 w-32 rounded-md" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-24 rounded-md" /></CardHeader><CardContent><Skeleton className="h-8 w-32 rounded-md" /></CardContent></Card>
        </div>
        <Card className="border-border/60">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 rounded-md" />
          </CardHeader>
          <CardContent className="h-[350px] w-full p-2">
            <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Loading stock data...</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Your curated list of top stocks to watch.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
