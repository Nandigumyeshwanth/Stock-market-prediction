"use client";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { Index, Stock, ChartData } from "@/lib/types";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getStockData, getStockOpinion } from "@/ai/flows/stock-flow";


type StockData = {
  stock: Stock;
  chartData: ChartData[];
};

const indices: Index[] = [
  { name: "NIFTY 50", value: "23,537.85", change: "+66.70", changePercent: 0.28 },
  { name: "BSE SENSEX", value: "77,337.59", change: "+131.18", changePercent: 0.17 },
  { name: "NIFTY BANK", value: "51,703.95", change: "+385.20", changePercent: 0.75 },
];

const initialWatchlist: Stock[] = [
    { ticker: "RELIANCE", name: "Reliance Industries Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "TCS", name: "Tata Consultancy Services Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "BHARTIARTL", name: "Bharti Airtel Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "ICICIBANK", name: "ICICI Bank Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "SBIN", name: "State Bank of India", price: 0, change: 0, changePercent: 0 },
    { ticker: "INFY", name: "Infosys Ltd.", price: 0, change: 0, changePercent: 0 },
    { ticker: "ITC", name: "ITC Ltd.", price: 0, change: 0, changePercent: 0 },
];

type StockDetailsState = StockData & {
  opinion?: string;
  opinionLoading?: boolean;
};

function Dashboard() {
  const searchParams = useSearchParams();
  const [watchlist, setWatchlist] = useState<Stock[]>(initialWatchlist);
  const [stockDetails, setStockDetails] = useState<Record<string, StockDetailsState>>({});
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [isGraphLoading, setIsGraphLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const graphCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getChartDomain = (data: StockData['chartData']): [number, number] => {
    if (!data || data.length === 0) {
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
  const currentOpinion = selectedStockData?.opinion;
  const isOpinionLoading = selectedTicker ? stockDetails[selectedTicker]?.opinionLoading : false;
  const chartDomain = getChartDomain(currentChartData);

  const fetchOpinionForStock = useCallback(async (ticker: string, name: string) => {
    setStockDetails(prev => ({
        ...prev,
        [ticker]: { ...(prev[ticker] as StockDetailsState), opinionLoading: true }
    }));

    try {
        const { recommendation } = await getStockOpinion({ticker, name});
        setStockDetails(prev => ({
            ...prev,
            [ticker]: { ...prev[ticker], opinion: recommendation, opinionLoading: false }
        }));
    } catch (error) {
        console.error(`Failed to fetch opinion for ${ticker}:`, error);
        setStockDetails(prev => ({
            ...prev,
            [ticker]: { ...prev[ticker], opinion: "Could not load AI opinion.", opinionLoading: false }
        }));
    }
  }, []);
  
  const handleStockSelection = useCallback(async (ticker: string) => {
    const upperTicker = ticker.toUpperCase();
    setSelectedTicker(upperTicker);

    if (graphCardRef.current) {
        graphCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (stockDetails[upperTicker]) {
      if (!stockDetails[upperTicker].opinion && !stockDetails[upperTicker].opinionLoading) {
        fetchOpinionForStock(upperTicker, stockDetails[upperTicker].stock.name);
      }
      return;
    }
    
    setIsGraphLoading(true);

    try {
        const dataArray = await getStockData({ tickers: [upperTicker] });

        if (!dataArray || dataArray.length === 0) {
          toast({
              title: "Data Not Found",
              description: `Could not load data for ${upperTicker}. The API may be busy or the ticker may not be supported. Please try again shortly.`,
              variant: "destructive",
          });
          setIsGraphLoading(false);
          return;
        }
        const data = dataArray[0];

        setStockDetails(prev => ({ ...prev, [upperTicker]: { ...data, opinionLoading: true } }));
        setWatchlist(prev => {
            const stockExists = prev.some(s => s.ticker === upperTicker);
            return !stockExists ? [data.stock, ...prev] : prev.map(s => s.ticker === upperTicker ? data.stock : s);
        });

        fetchOpinionForStock(upperTicker, data.stock.name);

    } catch (error) {
        console.error(`Failed to load stock details for ${upperTicker}:`, error);
        toast({
            title: "Error",
            description: `An unexpected error occurred while loading data for ${upperTicker}.`,
            variant: "destructive",
        });
    } finally {
        setIsGraphLoading(false);
    }
  }, [stockDetails, toast, fetchOpinionForStock]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadComplete) return;

      setIsGraphLoading(true);

      const tickers = initialWatchlist.map(s => s.ticker);
      try {
        const dataArray = await getStockData({ tickers });

        if (!dataArray || dataArray.length === 0) {
          throw new Error("Initial watchlist data could not be loaded.");
        }

        const newDetails: Record<string, StockDetailsState> = {};
        const newWatchlist: Stock[] = [];

        dataArray.forEach(data => {
          newDetails[data.stock.ticker] = { ...data, opinion: undefined, opinionLoading: false };
          newWatchlist.push(data.stock);
        });
        
        setStockDetails(newDetails);
        setWatchlist(newWatchlist);
        
        const firstTicker = newWatchlist[0]?.ticker;
        if (firstTicker) {
            setSelectedTicker(firstTicker);
            fetchOpinionForStock(firstTicker, newWatchlist[0].name);
        }

      } catch (error) {
        console.error("Failed to load initial watchlist:", error);
        toast({
          title: "API Error",
          description: "Could not load initial watchlist data. Please refresh.",
          variant: "destructive",
        });
      } finally {
        setIsGraphLoading(false);
        setInitialLoadComplete(true);
      }
    };

    loadInitialData();
  }, [initialLoadComplete, fetchOpinionForStock, toast]);
  
  useEffect(() => {
    const searchTicker = searchParams.get('ticker')?.toUpperCase();
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
        
        <div className="grid gap-4 md:grid-cols-3">
          {indices.map((index) => (
            <Card key={index.name} className="border-border/60">
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

        <Card ref={graphCardRef} className="border-border/60">
          <CardHeader>
            {isGraphLoading && !selectedStock ? (
                <Skeleton className="h-8 w-1/2" />
            ) : (
                <>
                <CardTitle>{selectedStock?.ticker} - {selectedStock?.name} Performance</CardTitle>
                <CardDescription>Historical price vs. AI-powered price prediction</CardDescription>
                </>
            )}
          </CardHeader>
          <CardContent className="h-[350px] w-full p-2">
           {isGraphLoading && !currentChartData.length ? (
                <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-4">Loading stock data...</p>
                </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                <XAxis dataKey="date" />
                <YAxis domain={chartDomain} tickFormatter={(value) => `₹${value.toFixed(0)}`} />
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
                <Area type="monotone" dataKey="price" name="Price" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorPrice)" />
                <Area type="monotone" dataKey="prediction" name="Prediction" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorPrediction)" strokeDasharray="5 5"/>
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Select a stock to view its detailed performance.</CardDescription>
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
                    onClick={() => handleStockSelection(stock.ticker)}
                    className={cn(
                      "transition-colors",
                      stock.price > 0 ? "cursor-pointer" : ""
                    )}
                    data-state={selectedTicker === stock.ticker ? "selected" : "unselected"}
                  >
                    <TableCell>
                      <Badge variant="outline">{stock.ticker}</Badge>
                    </TableCell>
                    <TableCell>{stock.name}</TableCell>
                    <TableCell className="text-right font-medium">
                        {stock.price > 0 ? `₹${stock.price.toFixed(2)}` : <Skeleton className="h-5 w-20 float-right" />}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                         stock.price === 0 ? "text-muted-foreground" : stock.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {stock.price > 0 ? `${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)` : <Skeleton className="h-5 w-24 float-right" />}
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
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your Infinytix dashboard.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
        </div>
        <Card className="border-border/60">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3 mt-1" />
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
             <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
              My Opinion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Select a stock to view its detailed performance.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
