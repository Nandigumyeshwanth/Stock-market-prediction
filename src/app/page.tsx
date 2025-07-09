
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
import type { Index, Stock } from "@/lib/types";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getStockData, type StockData } from "@/ai/flows/stock-flow";
import { getStockOpinion } from "@/ai/flows/stock-opinion-flow";

const indices: Index[] = [
  { name: "NIFTY 50", value: "23,537.85", change: "+66.70", changePercent: 0.28 },
  { name: "BSE SENSEX", value: "77,337.59", change: "+131.18", changePercent: 0.17 },
  { name: "NIFTY BANK", value: "51,703.95", change: "+385.20", changePercent: 0.75 },
];

const initialWatchlist: Stock[] = [
    { ticker: "RELIANCE", name: "Reliance Industries", price: 0, change: 0, changePercent: 0 },
    { ticker: "TCS", name: "Tata Consultancy", price: 0, change: 0, changePercent: 0 },
    { ticker: "HDFCBANK", name: "HDFC Bank", price: 0, change: 0, changePercent: 0 },
    { ticker: "INFY", name: "Infosys", price: 0, change: 0, changePercent: 0 },
    { ticker: "ADANIENT", name: "Adani Enterprises", price: 0, change: 0, changePercent: 0 },
    { ticker: "WIPRO", name: "Wipro", price: 0, change: 0, changePercent: 0 },
    { ticker: "TATAMOTORS", name: "Tata Motors", price: 0, change: 0, changePercent: 0 },
    { ticker: "ITC", name: "ITC Limited", price: 0, change: 0, changePercent: 0 },
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

  const selectedStockData = selectedTicker ? stockDetails[selectedTicker] : null;
  const selectedStock = selectedStockData?.stock;
  const currentChartData = selectedStockData?.chartData || [];
  const currentOpinion = selectedStockData?.opinion;
  const isOpinionLoading = selectedStockData?.opinionLoading;

  const handleStockSelection = useCallback(async (ticker: string) => {
    const upperTicker = ticker.toUpperCase();

    // Prevent re-fetching if data is already fully loaded
    if (stockDetails[upperTicker]?.opinion) {
      setSelectedTicker(upperTicker);
       if (graphCardRef.current) {
        graphCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // Set loading states and scroll
    setIsGraphLoading(true);
    setSelectedTicker(upperTicker);
    setStockDetails(prev => ({
        ...prev,
        [upperTicker]: { ...(prev[upperTicker] || {}), opinionLoading: true }
    }));
    if (graphCardRef.current) {
        graphCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      // Step 1: Fetch stock data (price, chart)
      const dataArray = await getStockData({ tickers: [upperTicker] });
      if (!dataArray || dataArray.length === 0) {
        throw new Error(`Stock data not found for ${upperTicker}`);
      }
      const data = dataArray[0];

      // Update state with graph data, allows graph to render
      setStockDetails(prev => ({ ...prev, [upperTicker]: { ...data, opinionLoading: true } }));
      setIsGraphLoading(false);

      // Update watchlist
      setWatchlist(prev => {
        const stockExists = prev.some(s => s.ticker === upperTicker);
        if (!stockExists) {
          return [data.stock, ...prev].slice(0, 10);
        }
        return prev.map(s => s.ticker === upperTicker ? data.stock : s);
      });

      // Step 2: Fetch opinion
      const { opinion } = await getStockOpinion({ ticker: data.stock.ticker, name: data.stock.name });
      setStockDetails(prev => ({ ...prev, [upperTicker]: { ...data, opinion, opinionLoading: false } }));

    } catch (error) {
        console.error("Failed to load stock details:", error);
        toast({
            title: "API Error",
            description: `Could not load data for ${upperTicker}. Please try again.`,
            variant: "destructive",
        });
        // Revert UI changes on error
        setSelectedTicker(prev => prev === upperTicker ? null : prev);
        setIsGraphLoading(false);
        setStockDetails(prev => {
            const newState = { ...prev };
            delete newState[upperTicker];
            return newState;
        });
    }
  }, [stockDetails, toast]);


  // Effect to handle initial load and subsequent searches
  useEffect(() => {
    const searchTicker = searchParams.get('ticker')?.toUpperCase();

    // On initial load, fetch data for the first stock or from search param
    if (!initialLoadComplete) {
      const tickerToLoad = searchTicker || (initialWatchlist.length > 0 ? initialWatchlist[0].ticker : null);
      if (tickerToLoad) {
        handleStockSelection(tickerToLoad);
      }
      setInitialLoadComplete(true);
    } else if (searchTicker && searchTicker !== selectedTicker) {
      // Handle subsequent searches
      handleStockSelection(searchTicker);
    }
  }, [searchParams, initialLoadComplete, selectedTicker, handleStockSelection]);

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
            {isGraphLoading && !selectedStock ? (
                <Skeleton className="h-8 w-1/2" />
            ) : (
                <CardTitle>{selectedStock?.ticker} - {selectedStock?.name} Performance</CardTitle>
            )}
          </CardHeader>
          <CardContent className="h-[350px] w-full p-2">
           {isGraphLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-4">Loading stock data...</p>
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
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
              AI Financial Opinion
            </CardTitle>
          </CardHeader>
          <CardContent>
             {isOpinionLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-muted-foreground">{currentOpinion || "No opinion available for this stock."}</p>
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
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
              AI Financial Opinion
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
        <Card>
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
