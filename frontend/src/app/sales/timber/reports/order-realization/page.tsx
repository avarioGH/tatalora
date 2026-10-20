"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { 
  Loader2, Printer, Search, TrendingUp, CheckCircle2, 
  Clock, AlertCircle, ArrowLeft, Layers, Target, BarChart2 
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function OrderRealizationReport() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sales/timber/reports/realization");
      setData(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter((row: any) => {
    const q = search.toLowerCase();
    const cust = (row.customerName || "").toLowerCase();
    const num = (row.orderNumber || "").toLowerCase();
    const spec = (row.species || "").toLowerCase();
    const size = `${row.thicknessMm}x${row.widthMm}x${row.lengthMm}`;
    return cust.includes(q) || num.includes(q) || spec.includes(q) || size.includes(q);
  });

  // Calculate Aggregates
  const totalOrderQty = data.reduce((s, r) => s + (r.orderQty || 0), 0);
  const totalOrderM3 = data.reduce((s, r) => s + (r.orderM3 || 0), 0);
  const totalRealizedQty = data.reduce((s, r) => s + (r.realizedQty || 0), 0);
  const totalRealizedM3 = data.reduce((s, r) => s + (r.realizedM3 || 0), 0);
  const totalRemainingQty = data.reduce((s, r) => s + Math.max(0, (r.remainingQty || 0)), 0);
  const totalRemainingM3 = data.reduce((s, r) => s + Math.max(0, (r.remainingM3 || 0)), 0);
  const overallPct = totalOrderM3 > 0 ? (totalRealizedM3 / totalOrderM3) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <Target className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Monitoring Realisasi PO / Kontrak Buyer
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pantauan target kontrak penjualan (Order) vs hasil gesek/pengiriman harian (Realisasi & Sisa)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => window.print()} 
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-semibold h-10 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" /> Cetak Laporan PO
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-600" /> Target Kontrak (Order)
            </p>
            <p className="text-2xl font-bold text-foreground">{totalOrderQty.toLocaleString("id-ID")} pcs</p>
            <p className="text-xs text-muted-foreground mt-0.5">{Number(totalOrderM3.toFixed(3))} m³ target buyer</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Realisasi Terpenuhi
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalRealizedQty.toLocaleString("id-ID")} pcs</p>
            <p className="text-xs text-muted-foreground mt-0.5">{Number(totalRealizedM3.toFixed(3))} m³ selesai</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Sisa Kurang Gesek
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalRemainingQty.toLocaleString("id-ID")} pcs</p>
            <p className="text-xs text-muted-foreground mt-0.5">{Number(totalRemainingM3.toFixed(3))} m³ harus diproduksi</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Pemenuhan Realisasi
            </p>
            <p className={`text-2xl font-bold ${overallPct >= 100 ? 'text-emerald-600' : overallPct >= 50 ? 'text-purple-600' : 'text-amber-600'}`}>
              {overallPct.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Persentase volume terpenuhi</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="print:shadow-none print:border-none rounded-xl border border-border shadow-sm overflow-hidden">
        <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" /> Tabel Monitoring PO vs Realisasi (Monitor Update)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Rincian setiap ukuran target kontrak buyer, jumlah batang/m³ yang sudah tergesek, dan sisa backlog
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-70" />
              <Input 
                type="search" 
                placeholder="Cari Customer, No. PO, Ukuran..." 
                className="pl-9 bg-background h-10" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-[1000px] w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th colSpan={3} className="border-r border-border p-2.5 text-center font-bold">INFO KONTRAK / PO</th>
                    <th colSpan={3} className="border-r border-border p-2.5 text-center font-bold">DIMENSI (MM)</th>
                    <th colSpan={2} className="border-r border-border p-2.5 text-center font-bold bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">ORDER (TARGET)</th>
                    <th colSpan={2} className="border-r border-border p-2.5 text-center font-bold bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">REALISASI</th>
                    <th colSpan={2} className="border-r border-border p-2.5 text-center font-bold bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">SISA KURANG</th>
                    <th className="p-2.5 text-center font-bold">PROGRESS</th>
                  </tr>
                  <tr className="bg-muted/30 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider">
                    <th className="border-r border-border p-2 text-left">Customer</th>
                    <th className="border-r border-border p-2 text-left">No. Order</th>
                    <th className="border-r border-border p-2 text-left">Jenis</th>
                    <th className="border-r border-border p-2 text-right">T</th>
                    <th className="border-r border-border p-2 text-right">L</th>
                    <th className="border-r border-border p-2 text-right">P</th>
                    <th className="border-r border-border p-2 text-right bg-blue-50/40 dark:bg-blue-950/10 font-bold">Pcs</th>
                    <th className="border-r border-border p-2 text-right bg-blue-50/40 dark:bg-blue-950/10 font-bold">M³</th>
                    <th className="border-r border-border p-2 text-right bg-emerald-50/40 dark:bg-emerald-950/10 font-bold">Pcs</th>
                    <th className="border-r border-border p-2 text-right bg-emerald-50/40 dark:bg-emerald-950/10 font-bold">M³</th>
                    <th className="border-r border-border p-2 text-right bg-amber-50/40 dark:bg-amber-950/10 font-bold">Pcs</th>
                    <th className="border-r border-border p-2 text-right bg-amber-50/40 dark:bg-amber-950/10 font-bold">M³</th>
                    <th className="p-2 text-center">% Realisasi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-muted-foreground">
                        Belum ada data realisasi PO. Kontrak penjualan akan otomatis muncul di sini.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row: any, i: number) => {
                      const isCompleted = row.realizedQty >= row.orderQty;
                      const isZero = row.realizedQty === 0;
                      const pct = Math.min(100, Math.max(0, row.fulfillmentPct || 0));

                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="border-r border-border p-2.5 font-semibold text-foreground/90">{row.customerName}</td>
                          <td className="border-r border-border p-2.5 font-mono text-xs text-primary">{row.orderNumber}</td>
                          <td className="border-r border-border p-2.5 text-xs font-medium text-muted-foreground">{row.species || "MERANTI"}</td>
                          
                          <td className="border-r border-border p-2.5 text-right font-mono">{row.thicknessMm}</td>
                          <td className="border-r border-border p-2.5 text-right font-mono">{row.widthMm}</td>
                          <td className="border-r border-border p-2.5 text-right font-mono">{row.lengthMm}</td>
                          
                          {/* Order */}
                          <td className="border-r border-border p-2.5 text-right font-semibold bg-blue-50/20 dark:bg-blue-950/10">{row.orderQty}</td>
                          <td className="border-r border-border p-2.5 text-right bg-blue-50/20 dark:bg-blue-950/10 font-medium">{Number(row.orderM3.toFixed(4))}</td>
                          
                          {/* Realisasi */}
                          <td className="border-r border-border p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{row.realizedQty}</td>
                          <td className="border-r border-border p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">{Number(row.realizedM3.toFixed(4))}</td>
                          
                          {/* Sisa */}
                          <td className="border-r border-border p-2.5 text-right font-bold text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                            {row.remainingQty > 0 ? row.remainingQty : 0}
                          </td>
                          <td className="border-r border-border p-2.5 text-right font-bold text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                            {row.remainingM3 > 0 ? Number(row.remainingM3.toFixed(4)) : 0}
                          </td>

                          {/* Progress */}
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isCompleted ? (
                                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">LENGKAP</Badge>
                              ) : isZero ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-500 font-bold text-[10px]">0%</Badge>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                                    <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                  </div>
                                  <span className="text-[11px] font-bold text-muted-foreground">{pct.toFixed(0)}%</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot className="bg-muted/60 font-bold border-t-2 border-border">
                    <tr>
                      <td colSpan={6} className="p-3 text-right uppercase tracking-wider border-r border-border">
                        TOTAL KESELURUHAN PO:
                      </td>
                      <td className="p-3 text-right border-r border-border bg-blue-50/30 dark:bg-blue-950/20">{totalOrderQty}</td>
                      <td className="p-3 text-right border-r border-border bg-blue-50/30 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400">{Number(totalOrderM3.toFixed(4))}</td>
                      <td className="p-3 text-right border-r border-border bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">{totalRealizedQty}</td>
                      <td className="p-3 text-right border-r border-border bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">{Number(totalRealizedM3.toFixed(4))}</td>
                      <td className="p-3 text-right border-r border-border bg-amber-50/30 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">{totalRemainingQty}</td>
                      <td className="p-3 text-right border-r border-border bg-amber-50/30 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">{Number(totalRemainingM3.toFixed(4))}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-primary">{overallPct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
