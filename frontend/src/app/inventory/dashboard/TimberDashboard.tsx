'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TimberAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Package, ArrowDownToLine, ArrowUpFromLine, Factory, 
  LayoutDashboard, CheckCircle2, AlertTriangle, FileText, 
  RefreshCw, Truck, Layers, Scissors, Trees, ArrowRight, Warehouse as WarehouseIcon
} from 'lucide-react';

export default function TimberDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setRefreshing(true);
    TimberAPI.getDashboardSummary()
      .then((res: any) => {
        setData(res || {});
      })
      .catch((err: any) => console.error("Error loading timber dashboard summary:", err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Memuat Dashboard Kayu & Real Data...</span>
      </div>
    </div>
  );

  const kpi = data?.kpi || { 
    stock: 0, 
    stockM3: 0, 
    details: { rawM3: 0, trimmedM3: 0, sawnM3: 0 },
    todayIn: 0, 
    todayInM3: 0, 
    todayOut: 0, 
    todayOutM3: 0, 
    production: 0, 
    productionM3: 0 
  };
  const pipeline = data?.pipeline || {
    partaiCount: 0,
    rawLogsCount: 0,
    rawNetM3: 0,
    trimmedLogsCount: 0,
    trimmedNetM3: 0,
    inputLogsCount: 0,
    inputNetM3: 0,
    sawnOutputPcs: 0,
    sawnOutputM3: 0,
    shipmentCount: 0,
    shipmentPcs: 0,
    shipmentM3: 0,
  };
  const ledgerHealth = data?.ledgerHealth || 'BALANCED';
  const warehouseSummary = data?.warehouseSummary || [];
  const recentMovements = data?.recentMovements || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-12 px-2 md:px-0">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Inventory Dashboard
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Ringkasan operasional terpadu: stok kayu fisik, alur proses pabrik, mutasi gudang, dan logistik armada.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData} 
            disabled={refreshing} 
            className="h-9 px-3 gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Segarkan Data
          </Button>

          {/* Ledger Health Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${ledgerHealth === 'BALANCED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-600'} shadow-sm`}>
            {ledgerHealth === 'BALANCED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Ledger Health: <span className="font-extrabold">{ledgerHealth}</span>
            </span>
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Stock */}
        <Card className="border border-border shadow-sm flex flex-col justify-between h-full bg-card">
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Overall Total Stock
              <Package className="w-4 h-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5 space-y-2 flex-1 flex flex-col justify-end">
            <div>
              <div className="text-xl md:text-3xl font-bold text-foreground leading-none flex items-baseline gap-1">
                {Number(kpi.stockM3 || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm font-medium text-muted-foreground">M3</span>
              </div>
              <div className="text-[13px] font-medium text-muted-foreground mt-1">
                {Number(kpi.stock || 0).toLocaleString()} Total Items / Pcs
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-1 pt-3 border-t border-border/50 mt-auto">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Raw Log</span>
                <span className="text-xs font-bold text-foreground">{Number(kpi.details?.rawM3 || 0).toFixed(1)} <span className="text-[10px] opacity-70">m³</span></span>
              </div>
              <div className="flex flex-col border-l border-border/50 pl-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Trimmed</span>
                <span className="text-xs font-bold text-foreground">{Number(kpi.details?.trimmedM3 || 0).toFixed(1)} <span className="text-[10px] opacity-70">m³</span></span>
              </div>
              <div className="flex flex-col border-l border-border/50 pl-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Sawn</span>
                <span className="text-xs font-bold text-foreground">{Number(kpi.details?.sawnM3 || 0).toFixed(1)} <span className="text-[10px] opacity-70">m³</span></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today In */}
        <Card className="border border-border shadow-sm flex flex-col justify-between h-full bg-card">
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Today Inflow
              <ArrowDownToLine className="w-4 h-4 text-emerald-500 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5 space-y-1">
            <div className="text-xl md:text-3xl font-bold text-foreground">
              {Number(kpi.todayIn || 0).toLocaleString()} <span className="text-xs md:text-sm font-medium text-muted-foreground">PCS</span>
            </div>
            <div className="text-xs md:text-sm font-medium text-muted-foreground">
              {Number(kpi.todayInM3 || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} M3
            </div>
          </CardContent>
        </Card>

        {/* Today Out */}
        <Card className="border border-border shadow-sm flex flex-col justify-between h-full bg-card">
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Today Outflow
              <ArrowUpFromLine className="w-4 h-4 text-amber-500 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5 space-y-1">
            <div className="text-xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">
              {Number(kpi.todayOut || 0).toLocaleString()} <span className="text-xs md:text-sm font-medium opacity-80">PCS</span>
            </div>
            <div className="text-xs md:text-sm font-medium text-muted-foreground">
              {Number(kpi.todayOutM3 || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} M3
            </div>
          </CardContent>
        </Card>

        {/* Production Today */}
        <Card className="border border-border shadow-sm flex flex-col justify-between h-full bg-card">
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex items-center justify-between">
              Production Today
              <Factory className="w-4 h-4 text-primary opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5 space-y-1">
            <div className="text-xl md:text-3xl font-bold text-primary">
              {Number(kpi.production || 0).toLocaleString()} <span className="text-xs md:text-sm font-medium opacity-80">PCS</span>
            </div>
            <div className="text-xs md:text-sm font-medium text-muted-foreground">
              {Number(kpi.productionM3 || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} M3
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TIMBER PROCESSING PIPELINE (ALUR OPERASI KAYU) */}
      <Card className="border border-border shadow-sm bg-card overflow-hidden">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm md:text-base font-bold">
                Alur Operasi Kayu (Timber Flow Pipeline)
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Klik tahapan untuk membuka modul terkait
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1. Partai */}
            <Link 
              href="/inventory/partai"
              className="group p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">1. Partai</span>
                <Layers className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {Number(pipeline.partaiCount || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">Partai Aktif</div>
              </div>
            </Link>

            {/* 2. Log DUKB */}
            <Link 
              href="/inventory/logs"
              className="group p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">2. Log DUKB</span>
                <Trees className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {Number(pipeline.rawLogsCount || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">log</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{Number(pipeline.rawNetM3 || 0).toFixed(1)} m³ Netto</div>
              </div>
            </Link>

            {/* 3. Trimming */}
            <Link 
              href="/inventory/trimming"
              className="group p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">3. Trimming</span>
                <Scissors className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {Number(pipeline.trimmedLogsCount || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">log</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{Number(pipeline.trimmedNetM3 || 0).toFixed(1)} m³ Bersih</div>
              </div>
            </Link>

            {/* 4. Input WIP */}
            <Link 
              href="/inventory/input-logs"
              className="group p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">4. Input Sawmill</span>
                <Factory className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {Number(pipeline.inputLogsCount || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sesi</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{Number(pipeline.inputNetM3 || 0).toFixed(1)} m³ Terproses</div>
              </div>
            </Link>

            {/* 5. Output Sawn */}
            <Link 
              href="/inventory/sawn-timber/output"
              className="group p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">5. Kayu Jadi</span>
                <Package className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {Number(pipeline.sawnOutputPcs || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">pcs</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{Number(pipeline.sawnOutputM3 || 0).toFixed(2)} m³ Hasil</div>
              </div>
            </Link>

            {/* 6. Muatan Fuso */}
            <Link 
              href="/inventory/shipment"
              className="group p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">6. Muatan Fuso</span>
                <Truck className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {Number(pipeline.shipmentCount || 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">truk</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{Number(pipeline.shipmentPcs || 0).toLocaleString()} pcs Terkirim</div>
              </div>
            </Link>

          </div>
        </CardContent>
      </Card>

      {/* LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* WAREHOUSE SUMMARY */}
        <Card className="lg:col-span-5 border border-border shadow-sm flex flex-col bg-card">
          <CardHeader className="px-5 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-primary" />
                Stok per Gudang
              </CardTitle>
              <Link href="/inventory/warehouses" className="text-xs text-primary hover:underline">
                Kelola Gudang
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            {warehouseSummary.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground flex-1">
                <Package className="w-8 h-8 opacity-20 mb-2" />
                <span className="text-sm">Belum ada data stok per gudang</span>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {warehouseSummary.map((w: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-foreground/90">{w.name}</div>
                      {w.stockM3 > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Volume: {Number(w.stockM3).toFixed(3)} m³
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                      {Number(w.stock || 0).toLocaleString()} PCS
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT MOVEMENTS */}
        <Card className="lg:col-span-7 border border-border shadow-sm flex flex-col bg-card">
          <CardHeader className="px-5 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Mutasi Stok Terakhir
              </CardTitle>
              <Link href="/inventory/movements" className="text-xs text-primary hover:underline">
                Lihat Semua
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden flex-1">
            <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none">
              <table className="w-full text-sm min-w-[550px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase">Tanggal</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase">Tipe</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase">Rincian / Gudang</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 opacity-20" />
                          <span>Belum ada mutasi stok tercatat</span>
                        </div>
                      </td>
                    </tr>
                  ) : recentMovements.map((m: any, i: number) => {
                    const isOut = (m.type || '').toUpperCase() === 'OUT';
                    const isIn = (m.type || '').toUpperCase() === 'IN';
                    return (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-foreground/80 text-xs whitespace-nowrap">
                          {m.date ? new Date(m.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isIn ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 
                            isOut ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 
                            'bg-primary/15 text-primary'
                          }`}>
                            {m.type} {m.referenceType ? `• ${m.referenceType.replace('_', ' ')}` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs font-medium text-foreground line-clamp-1">
                            {m.description || 'Kayu Jadi'}
                          </div>
                          {m.warehouseName && (
                            <div className="text-[11px] text-muted-foreground">
                              {m.warehouseName}
                            </div>
                          )}
                        </td>
                        <td className="text-right py-3 px-4 whitespace-nowrap">
                          <span className={`font-bold text-xs ${isOut ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                            {isOut ? '-' : '+'}{Number(m.qty || 0).toLocaleString()} pcs
                          </span>
                          {m.volumeM3 > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              {Number(m.volumeM3).toFixed(3)} m³
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
