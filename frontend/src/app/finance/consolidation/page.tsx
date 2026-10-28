"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Building2, Plus, Download, Search, CheckCircle2, RefreshCcw, Layers, ArrowUpRight, TrendingUp, PieChart, FileText
} from "lucide-react"

export default function ConsolidationPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const companies = [
    {
      id: "comp-1",
      name: "BOOSTUP INDONESIA (Holding)",
      code: "ID-833072",
      role: "Parent Company",
      currency: "IDR",
      revenue: 850000000,
      net_profit: 240000000,
      assets: 1450000000,
      ownership: "100%"
    },
    {
      id: "comp-2",
      name: "PT TATALORA TEKNOLOGI",
      code: "ID-100241",
      role: "Subsidiary",
      currency: "IDR",
      revenue: 420000000,
      net_profit: 95000000,
      assets: 620000000,
      ownership: "85%"
    },
    {
      id: "comp-3",
      name: "CV LOGISTIK SENTOSA",
      code: "ID-304912",
      role: "Subsidiary",
      currency: "IDR",
      revenue: 190000000,
      net_profit: 35000000,
      assets: 280000000,
      ownership: "70%"
    }
  ]

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const totalConsolidatedRevenue = companies.reduce((a, c) => a + c.revenue, 0)
  const totalConsolidatedProfit = companies.reduce((a, c) => a + c.net_profit, 0)
  const totalConsolidatedAssets = companies.reduce((a, c) => a + c.assets, 0)

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Layers className="h-6 w-6 text-indigo-600" />
            </div>
            Konsolidasi Keuangan Antar Perusahaan (Multi-Entity)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gabungkan dan eliminasi transaksi antar entitas anak perusahaan untuk laporan keuangan holding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 bg-card border-border" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Export Laporan Gabungan
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => alert("Tambah entitas anak perusahaan baru")}>
            <Plus className="w-4 h-4" /> Tambah Entitas Anak
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Pendapatan Terkonsolidasi</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{formatIDR(totalConsolidatedRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Gabungan 3 entitas bisnis</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Laba Bersih Konsolidasian</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">{formatIDR(totalConsolidatedProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Setelah alokasi laba kepentingan non-pengendali</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Nilai Aset Konsolidasi</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">{formatIDR(totalConsolidatedAssets)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Termasuk aset tetap & modal kerja</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border shadow-sm bg-card overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-lg">Daftar Entitas dalam Grup</CardTitle>
          <CardDescription>Rincian kontribusi pendapatan dan aset per entitas hukum</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Nama Perusahaan</TableHead>
                  <TableHead className="font-semibold">ID / Kode</TableHead>
                  <TableHead className="font-semibold">Status Peran</TableHead>
                  <TableHead className="text-center font-semibold">Porsi Kepemilikan</TableHead>
                  <TableHead className="text-right font-semibold">Pendapatan</TableHead>
                  <TableHead className="text-right font-semibold">Laba Bersih</TableHead>
                  <TableHead className="text-right font-semibold">Total Aset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/20 border-b">
                    <TableCell className="font-semibold text-foreground flex items-center gap-2 py-4">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      {c.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>
                      <Badge variant={c.role === 'Parent Company' ? 'default' : 'secondary'} className="text-xs">
                        {c.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{c.ownership}</TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(c.revenue)}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{formatIDR(c.net_profit)}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{formatIDR(c.assets)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
