
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
import { useToast } from "@/hooks/use-toast";

const indices: Index[] = [
  { name: "NIFTY 50", value: "23,537.85", change: "+66.70", changePercent: 0.28 },
  { name: "BSE SENSEX", value: "77,337.59", change: "+131.18", changePercent: 0.17 },
  { name: "NIFTY BANK", value: "51,703.95", change: "+385.20", changePercent: 0.75 },
];

const mockStockData: Record<string, { stock: Stock, chartData: ChartData[] }> = {
  "RELIANCE": {
    stock: { ticker: "RELIANCE", name: "Reliance Industries Ltd.", price: 2960.55, change: 55.15, changePercent: 1.90 },
    chartData: [
      { date: 'Jan', price: 2700, prediction: 2710 },
      { date: 'Feb', price: 2750, prediction: 2760 },
      { date: 'Mar', price: 2800, prediction: 2810 },
      { date: 'Apr', price: 2850, prediction: 2860 },
      { date: 'May', price: 2900, prediction: 2910 },
      { date: 'Jun', price: 2960.55, prediction: 2960.55 },
      { date: 'Jul', prediction: 3010 },
      { date: 'Aug', prediction: 3050 },
      { date: 'Sep', prediction: 3100 },
      { date: 'Oct', prediction: 3150 },
    ]
  },
  "ADANIENT": {
    stock: { ticker: "ADANIENT", name: "Adani Enterprises Ltd.", price: 3185.00, change: -65.00, changePercent: -2.00 },
    chartData: [
        { date: 'Jan', price: 3400, prediction: 3410 },
        { date: 'Feb', price: 3350, prediction: 3360 },
        { date: 'Mar', price: 3300, prediction: 3310 },
        { date: 'Apr', price: 3250, prediction: 3260 },
        { date: 'May', price: 3200, prediction: 3210 },
        { date: 'Jun', price: 3185.00, prediction: 3185.00 },
        { date: 'Jul', prediction: 3150 },
        { date: 'Aug', prediction: 3120 },
        { date: 'Sep', prediction: 3100 },
        { date: 'Oct', prediction: 3080 },
    ]
  },
  "TCS": {
      stock: { ticker: "TCS", name: "Tata Consultancy Services", price: 3820.75, change: 20.25, changePercent: 0.53 },
      chartData: [
        { date: 'Jan', price: 3600, prediction: 3610 },
        { date: 'Feb', price: 3650, prediction: 3660 },
        { date: 'Mar', price: 3700, prediction: 3710 },
        { date: 'Apr', price: 3750, prediction: 3760 },
        { date: 'May', price: 3800, prediction: 3810 },
        { date: 'Jun', price: 3820.75, prediction: 3820.75 },
        { date: 'Jul', prediction: 3850 },
        { date: 'Aug', prediction: 3880 },
        { date: 'Sep', prediction: 3910 },
        { date: 'Oct', prediction: 3940 },
      ]
  },
  "HDFCBANK": {
      stock: { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", price: 1650.45, change: 15.80, changePercent: 0.97 },
      chartData: [
        { date: 'Jan', price: 1500, prediction: 1510 },
        { date: 'Feb', price: 1550, prediction: 1560 },
        { date: 'Mar', price: 1600, prediction: 1610 },
        { date: 'Apr', price: 1620, prediction: 1630 },
        { date: 'May', price: 1640, prediction: 1645 },
        { date: 'Jun', price: 1650.45, prediction: 1650.45 },
        { date: 'Jul', prediction: 1670 },
        { date: 'Aug', prediction: 1690 },
        { date: 'Sep', prediction: 1710 },
        { date: 'Oct', prediction: 1730 },
      ]
  },
  "INFY": {
      stock: { ticker: "INFY", name: "Infosys Ltd.", price: 1550.80, change: 12.10, changePercent: 0.79 },
      chartData: [
        { date: 'Jan', price: 1400, prediction: 1410 },
        { date: 'Feb', price: 1420, prediction: 1430 },
        { date: 'Mar', price: 1450, prediction: 1460 },
        { date: 'Apr', price: 1480, prediction: 1490 },
        { date: 'May', price: 1520, prediction: 1525 },
        { date: 'Jun', price: 1550.80, prediction: 1550.80 },
        { date: 'Jul', prediction: 1570 },
        { date: 'Aug', prediction: 1590 },
        { date: 'Sep', prediction: 1610 },
        { date: 'Oct', prediction: 1630 },
      ]
  },
};

const initialWatchlist: Stock[] = Object.values(mockStockData).map(d => d.stock);
const initialChartData = Object.entries(mockStockData).reduce((acc, [key, value]) => {
    acc[key] = value.chartData;
    return acc;
}, {} as Record<string, ChartData[]>);

function Dashboard() {
  const searchParams = useSearchParams();
  const [watchlist, setWatchlist] = useState<Stock[]>(initialWatchlist);
  const [stockChartData, setStockChartData] = useState<Record<string, ChartData[]>>(initialChartData);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleStockSelection = useCallback((ticker: string) => {
    setIsLoading(true);
    if (graphCardRef.current) {
        graphCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const data = mockStockData[ticker.toUpperCase()];
    if (data) {
        setSelectedStock(data.stock);
        setStockChartData(prev => ({ ...prev, [data.stock.ticker]: data.chartData }));
    } else {
        toast({
            title: "Not Found",
            description: `Data for ${ticker} is not available. Please select from the watchlist.`,
            variant: "destructive",
        });
    }
    
    // Simulate loading
    setTimeout(() => setIsLoading(false), 300);
  }, [toast]);

  useEffect(() => {
    const ticker = searchParams.get('ticker');
    handleStockSelection(ticker || "RELIANCE");
  }, [searchParams, handleStockSelection]);

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
                    className="cursor-pointer"
                    data-state={selectedStock?.ticker === stock.ticker ? "selected" : "unselected"}
                  >
                    <TableCell>
                      <Badge variant="outline">{stock.ticker}</Badge>
                    </TableCell>
                    <TableCell>{stock.name}</TableCell>
                    <TableCell className="text-right font-medium">
                        {`₹${stock.price.toFixed(2)}`}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        stock.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {`${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)`}
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
