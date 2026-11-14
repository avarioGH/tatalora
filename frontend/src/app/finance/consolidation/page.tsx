"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Building2, Plus, Download, Layers, AlertCircle, Info, Sparkles
} from "lucide-react"

export default function ConsolidationPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [newEntity, setNewEntity] = useState({
    name: "",
    code: "",
    ownership: "100%",
    revenue: "",
    net_profit: "",
    assets: ""
  })

  const [companies, setCompanies] = useState([
    {
      id: "comp-1",
      name: "TATALORA INDONESIA (Holding)",
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
  ])

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const totalConsolidatedRevenue = companies.reduce((a, c) => a + c.revenue, 0)
  const totalConsolidatedProfit = companies.reduce((a, c) => a + c.net_profit, 0)
  const totalConsolidatedAssets = companies.reduce((a, c) => a + c.assets, 0)

  // Perhitungan Atribusi Laba Bersih Sesuai PSAK 65 (CSL-03)
  const holdingAttributableProfit = companies.reduce((acc, c) => {
    const pct = parseFloat(c.ownership) / 100 || 1.0;
    return acc + (c.net_profit * pct);
  }, 0);
  const nonControllingInterestProfit = totalConsolidatedProfit - holdingAttributableProfit;

  const handleAddEntity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEntity.name) return
    const created = {
      id: "comp-" + Date.now(),
      name: newEntity.name,
      code: newEntity.code || `ID-${Math.floor(100000 + Math.random() * 900000)}`,
      role: "Subsidiary",
      currency: "IDR",
      revenue: Number(newEntity.revenue) || 0,
      net_profit: Number(newEntity.net_profit) || 0,
      assets: Number(newEntity.assets) || 0,
      ownership: newEntity.ownership || "100%"
    }
    setCompanies([...companies, created])
    setModalOpen(false)
    setNewEntity({ name: "", code: "", ownership: "100%", revenue: "", net_profit: "", assets: "" })
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Layers className="h-6 w-6 text-indigo-600" />
              </div>
              Konsolidasi Keuangan Antar Perusahaan (Multi-Entity)
            </h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> Pratinjau Holding
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Gabungkan dan eliminasi transaksi antar entitas anak perusahaan untuk laporan keuangan holding grup (Periode Buku 2026).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 bg-card border-border" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Export Laporan Gabungan
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Tambah Entitas Anak
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-muted/40 border border-border rounded-xl flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Catatan Standar Konsolidasi SAK (PSAK 65):</p>
          <p>
            Angka di bawah mencerminkan simulasi agregat pendapatan, laba, dan aset dari entitas holding dan anak. 
            Transaksi antar entitas (intercompany debt/sales) otomatis dieliminasi saat penutupan buku tahunan grup.
          </p>
        </div>
      </div>

      {/* Modal Dialog Tambah Entitas */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <form onSubmit={handleAddEntity}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Tambah Entitas Anak Perusahaan
              </DialogTitle>
              <DialogDescription>
                Daftarkan anak perusahaan baru untuk dihubungkan ke dalam grup konsolidasi laporan keuangan holding.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1">
                <Label>Nama Entitas / Perusahaan <span className="text-rose-500">*</span></Label>
                <Input 
                  placeholder="Contoh: PT Bahari Nusantara Perkasa"
                  value={newEntity.name}
                  onChange={e => setNewEntity({ ...newEntity, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Kode Entitas</Label>
                  <Input 
                    placeholder="Contoh: ID-405819"
                    value={newEntity.code}
                    onChange={e => setNewEntity({ ...newEntity, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Porsi Kepemilikan Holding</Label>
                  <Input 
                    placeholder="Contoh: 80%"
                    value={newEntity.ownership}
                    onChange={e => setNewEntity({ ...newEntity, ownership: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Estimasi Pendapatan Tahunan (Rp)</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={newEntity.revenue}
                  onChange={e => setNewEntity({ ...newEntity, revenue: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Simpan Entitas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Pendapatan Terkonsolidasi (2026)</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{formatIDR(totalConsolidatedRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Gabungan {companies.length} entitas bisnis</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Laba Bersih Konsolidasian (2026)</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">{formatIDR(totalConsolidatedProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Induk: <strong className="text-foreground">{formatIDR(holdingAttributableProfit)}</strong> | Non-Pengendali: <strong className="text-foreground">{formatIDR(nonControllingInterestProfit)}</strong>
            </p>
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
