"use client";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Holding } from "@/lib/types";
import { ArrowDown, ArrowUp, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const holdings: Holding[] = [
  { ticker: "AAPL", name: "Apple Inc.", shares: 50, avgCost: 150.00, currentPrice: 194.82 },
  { ticker: "GOOGL", name: "Alphabet Inc.", shares: 20, avgCost: 135.50, currentPrice: 177.07 },
  { ticker: "MSFT", name: "Microsoft Corp.", shares: 30, avgCost: 300.25, currentPrice: 423.85 },
];

const PortfolioPage = () => {
  const totalValue = holdings.reduce((acc, h) => acc + h.shares * h.currentPrice, 0);
  const totalCost = holdings.reduce((acc, h) => acc + h.shares * h.avgCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = (totalGainLoss / totalCost) * 100;
  // Mock day's gain/loss
  const dayGainLoss = 253.78;
  const dayGainLossPercent = (dayGainLoss / (totalValue - dayGainLoss)) * 100;

  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Portfolio</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Stock</DialogTitle>
                <DialogDescription>
                  Enter the details of the stock you want to add to your portfolio.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ticker" className="text-right">Ticker</Label>
                  <Input id="ticker" placeholder="e.g., AAPL" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="shares" className="text-right">Shares</Label>
                  <Input id="shares" type="number" placeholder="e.g., 10" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">Purchase Price</Label>
                  <Input id="price" type="number" placeholder="e.g., 150.00" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add to Portfolio</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today's Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", dayGainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                ${dayGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                ${totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  const gainLossPercent = (gainLoss / totalCost) * 100;
                  return (
                    <TableRow key={h.ticker}>
                      <TableCell>
                        <div className="font-medium">
                          <Badge variant="outline" className="mr-2">{h.ticker}</Badge>
                          {h.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{h.shares}</TableCell>
                      <TableCell className="text-right">${h.avgCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${h.currentPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${totalValue.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right", gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                        <div className="font-medium">${gainLoss.toFixed(2)}</div>
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
