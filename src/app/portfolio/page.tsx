"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Holding } from "@/lib/types";
import { ArrowDown, ArrowUp, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { REAL_STOCK_DATA } from "@/lib/real-stock-data";


const initialHoldings: Holding[] = [
  { ticker: "RELIANCE", name: "Reliance Industries Ltd.", shares: 20, avgCost: 1450.00, currentPrice: REAL_STOCK_DATA['RELIANCE'].price },
  { ticker: "ADANIENT", name: "Adani Enterprises Ltd.", shares: 15, avgCost: 2500.00, currentPrice: REAL_STOCK_DATA['ADANIENT'].price },
  { ticker: "TCS", name: "Tata Consultancy Services", shares: 30, avgCost: 3300.75, currentPrice: REAL_STOCK_DATA['TCS'].price },
  { ticker: "WIPRO", name: "Wipro Ltd.", shares: 100, avgCost: 250.00, currentPrice: REAL_STOCK_DATA['WIPRO'].price },
];

const PortfolioPage = () => {
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStock, setNewStock] = useState({ ticker: '', shares: '', price: '' });
  const { toast } = useToast();

  const totalValue = holdings.reduce((acc, h) => acc + h.shares * h.currentPrice, 0);
  const totalCost = holdings.reduce((acc, h) => acc + h.shares * h.avgCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  
  // Mock day's gain/loss
  const dayGainLoss = holdings.reduce((acc, h) => {
    const stockData = REAL_STOCK_DATA[h.ticker];
    if (stockData) {
      const change = (stockData.price * (stockData.changePercent / 100));
      return acc + (change * h.shares);
    }
    return acc;
  }, 0);

  const dayGainLossPercent = (totalValue - dayGainLoss) !== 0 ? (dayGainLoss / (totalValue - dayGainLoss)) * 100 : 0;


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewStock(prev => ({ ...prev, [id]: value }));
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const { ticker, shares, price } = newStock;
    const upperTicker = ticker.toUpperCase();
    
    if (!ticker || !shares || !price || parseFloat(shares) <= 0 || parseFloat(price) < 0) {
        toast({
          title: "Invalid Input",
          description: "Please fill out all fields with valid numbers.",
          variant: "destructive",
        })
        return;
    }

    const stockData = REAL_STOCK_DATA[upperTicker];

    const newHolding: Holding = {
        ticker: upperTicker,
        name: stockData ? stockData.name : `${upperTicker} - (Custom)`,
        shares: parseFloat(shares),
        avgCost: parseFloat(price),
        currentPrice: stockData ? stockData.price : parseFloat(price),
    };

    setHoldings(prevHoldings => [...prevHoldings, newHolding]);
    setNewStock({ ticker: '', shares: '', price: '' });
    setIsDialogOpen(false);
    toast({
      title: "Stock Added",
      description: `${shares} shares of ${upperTicker} added to your portfolio.`,
    })
  };


  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Portfolio</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Stock
            </Button>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Stock</DialogTitle>
                <DialogDescription>
                  Enter the details of the stock you want to add to your portfolio.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddStock}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ticker" className="text-right">Ticker</Label>
                    <Input id="ticker" placeholder="e.g., RELIANCE" className="col-span-3" value={newStock.ticker} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="shares" className="text-right">Shares</Label>
                    <Input id="shares" type="number" placeholder="e.g., 10" className="col-span-3" value={newStock.shares} onChange={handleInputChange}/>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">Purchase Price</Label>
                    <Input id="price" type="number" placeholder="e.g., 2900.00" className="col-span-3" value={newStock.price} onChange={handleInputChange}/>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add to Portfolio</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today's Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", dayGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                ₹{dayGainLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className={cn("text-xs", dayGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                {dayGainLoss >= 0 ? <ArrowUp className="inline h-4 w-4" /> : <ArrowDown className="inline h-4 w-4" />}
                {dayGainLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                ₹{totalGainLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className={cn("text-xs", totalGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                {totalGainLoss >= 0 ? <ArrowUp className="inline h-4 w-4" /> : <ArrowDown className="inline h-4 w-4" />}
                {totalGainLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Avg. Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Total Gain/Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => {
                  const totalValue = h.shares * h.currentPrice;
                  const totalCost = h.shares * h.avgCost;
                  const gainLoss = totalValue - totalCost;
                  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
                  return (
                    <TableRow key={h.ticker}>
                      <TableCell>
                        <div className="font-medium">
                          <Badge variant="outline" className="mr-2">{h.ticker}</Badge>
                          {h.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{h.shares}</TableCell>
                      <TableCell className="text-right">₹{h.avgCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{h.currentPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{totalValue.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right", gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                        <div className="font-medium">₹{gainLoss.toFixed(2)}</div>
                        <div className="text-xs">({gainLossPercent.toFixed(2)}%)</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PortfolioPage;
