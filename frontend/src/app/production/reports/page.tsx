"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionReportAPI } from "@/lib/api";
import { Factory, Trees, BarChart3, TrendingUp, Box, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductionReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getSummary().then((res: any) => {
      setData(res.data || res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading summary...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Production Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Input Log Registered</CardTitle>
            <Trees className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.inputLogCount || 0} PCS</div>
            <p className="text-xs text-muted-foreground">{data?.inputLogM3?.toFixed(4) || 0} M3</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Consumed Input</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.consumedM3?.toFixed(4) || 0} M3</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sawn Timber Output</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.outputPcs || 0} PCS</div>
            <p className="text-xs text-muted-foreground">{data?.outputM3?.toFixed(4) || 0} M3</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rendement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.rendement !== null ? data.rendement.toFixed(2) + '%' : '-'}</div>
            <p className="text-xs text-muted-foreground">Overall ratio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Link href="/production/reports/rendement"><Button variant="outline" className="w-full justify-between">Rendement Report <ArrowRight className="h-4 w-4"/></Button></Link>
        <Link href="/production/reports/products"><Button variant="outline" className="w-full justify-between">Production by Product <ArrowRight className="h-4 w-4"/></Button></Link>
        <Link href="/production/reports/shifts"><Button variant="outline" className="w-full justify-between">Production by Shift <ArrowRight className="h-4 w-4"/></Button></Link>
        <Link href="/production/reports/chamber"><Button variant="outline" className="w-full justify-between">Chamber Stock & Movements <ArrowRight className="h-4 w-4"/></Button></Link>
        <Link href="/production/reports/daily"><Button variant="outline" className="w-full justify-between">Daily Monitoring <ArrowRight className="h-4 w-4"/></Button></Link>
        <Link href="/production/reports/reconciliation"><Button variant="outline" className="w-full justify-between">Inventory Reconciliation <ArrowRight className="h-4 w-4"/></Button></Link>
        <Link href="/production/reports/data-quality"><Button variant="outline" className="w-full justify-between border-destructive text-destructive hover:bg-destructive/10">Data Quality Alerts <ArrowRight className="h-4 w-4"/></Button></Link>
      </div>
    </div>
  );
}
