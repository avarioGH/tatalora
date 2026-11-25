"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Calendar, FileSpreadsheet, RefreshCw, FolderOpen } from "lucide-react";

export default function DailyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    ProductionReportAPI.getDaily().then((res: any) => {
      const list = res.data || res || [];
      setData(Array.isArray(list) ? list : []);
      setLoading(false);
    }).catch(() => {
      setData([]);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatVol = (val: any) => {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
      return "-";
    }
    const num = Number(val);
    return num === 0 ? "0 m³" : `${num.toLocaleString("id-ID", { maximumFractionDigits: 2 })} m³`;
  };

  const formatRendement = (val: any, inputVal?: any) => {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
      return <span className="text-muted-foreground italic text-xs">Belum ada data</span>;
    }
    const num = Number(val);
    if (inputVal !== undefined && Number(inputVal) === 0) {
      return <span className="text-muted-foreground italic text-xs">Tidak dapat dihitung (0 input)</span>;
    }
    return (
      <Badge variant="outline" className={num >= 50 ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold" : "bg-amber-50 text-amber-700 border-amber-300 font-bold"}>
        {num.toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/production/reports">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" /> Pusat Laporan
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Laporan Produksi Harian (Daily Production)</h1>
          <p className="text-sm text-muted-foreground">
            Rekapitulasi pasokan kayu log, pemotongan sawn timber, rendemen efisiensi, dan pengeringan chamber.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
          </Button>
          <Link href="/manufacturing/orders/create">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
              + Catat Produksi Baru
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border shadow-xs bg-card overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold">Tabel Alur Volume & Rendemen Harian</CardTitle>
              <CardDescription className="text-xs">Satuan volume terstandarisasi dalam meter kubik (m³)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat data rekapitulasi harian...
            </div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">Belum ada catatan aktivitas produksi harian.</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Laporan akan terisi otomatis saat Surat Perintah Kerja (SPK) diproses melalui stasiun pemotongan sawmill.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">Tanggal</TableHead>
                    <TableHead className="text-right font-semibold">Log Supply</TableHead>
                    <TableHead className="text-right font-semibold">Trimming</TableHead>
                    <TableHead className="text-right font-semibold">Bahan Terpakai</TableHead>
                    <TableHead className="text-right font-semibold">Output Sawn</TableHead>
                    <TableHead className="text-right font-semibold">Rendemen (%)</TableHead>
                    <TableHead className="text-right font-semibold">Chamber Masuk</TableHead>
                    <TableHead className="text-right font-semibold">Chamber Keluar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i} className="border-b hover:bg-muted/20">
                      <TableCell className="font-medium">
                        {row.date ? new Date(row.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatVol(row.logSupply)}</TableCell>
                      <TableCell className="text-right">{formatVol(row.trimming)}</TableCell>
                      <TableCell className="text-right font-medium">{formatVol(row.consumedInput)}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">{formatVol(row.sawnOutput)}</TableCell>
                      <TableCell className="text-right">{formatRendement(row.rendement, row.consumedInput)}</TableCell>
                      <TableCell className="text-right">{formatVol(row.chamberIn)}</TableCell>
                      <TableCell className="text-right">{formatVol(row.chamberOut)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
