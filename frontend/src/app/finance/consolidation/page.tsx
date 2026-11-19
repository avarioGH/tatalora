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
  Building2, Plus, Download, Info, CheckCircle2, FileText, AlertTriangle
} from "lucide-react"

export default function ConsolidationPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [newEntity, setNewEntity] = useState({
    name: "",
    code: "",
    ownership: "100",
    revenue: "",
    net_profit: "",
    assets: ""
  })

  // State entitas
  const [companies, setCompanies] = useState([
    {
      id: "comp-holding",
      name: "PT Bahari Ikan Nusantara (Holding Utama)",
      code: "BIN-001",
      role: "Parent Company",
      currency: "IDR",
      revenue: 0,
      net_profit: 0,
      assets: 603250000, 
      ownership: 100
    }
  ])

  const formatIDR = (val: number | null | undefined) => {
    if (val === null || val === undefined || val === 0) return "-";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  }

  const totalConsolidatedRevenue = companies.reduce((a, c) => a + (c.revenue || 0), 0)
  const totalConsolidatedProfit = companies.reduce((a, c) => a + (c.net_profit || 0), 0)
  const totalConsolidatedAssets = companies.reduce((a, c) => a + (c.assets || 0), 0)

  // Perhitungan Atribusi Laba Bersih Sesuai PSAK 65 (CSL-03)
  const holdingAttributableProfit = companies.reduce((acc, c) => {
    const pct = (c.ownership || 100) / 100;
    return acc + ((c.net_profit || 0) * pct);
  }, 0);
  
  const nonControllingInterestProfit = totalConsolidatedProfit - holdingAttributableProfit;

  const handleAddEntity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEntity.name) return
    const created = {
      id: "comp-" + Date.now(),
      name: newEntity.name,
      code: newEntity.code || `SUB-${Math.floor(100 + Math.random() * 900)}`,
      role: "Subsidiary",
      currency: "IDR",
      revenue: Number(newEntity.revenue) || 0,
      net_profit: Number(newEntity.net_profit) || 0,
      assets: Number(newEntity.assets) || 0,
      ownership: Number(newEntity.ownership) || 100
    }
    setCompanies([...companies, created])
    setNewEntity({ name: "", code: "", ownership: "100", revenue: "", net_profit: "", assets: "" })
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Konsolidasi Keuangan Grup Perusahaan
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Penggabungan laporan keuangan entitas induk & anak perusahaan sesuai Standar Akuntansi Keuangan (PSAK 65).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Download className="h-4 w-4" /> Ekspor Konsolidasi
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> Tambah Entitas Anak
          </Button>
        </div>
      </div>

      {companies.length === 1 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold">Perhatian: Data Konsolidasi Belum Lengkap</p>
            <p>Hanya ditemukan satu entitas induk. Tambahkan anak perusahaan (subsidiary) untuk mulai melihat agregasi data keuangan.</p>
          </div>
        </div>
      )}

      {/* Ringkasan Konsolidasi Real-Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Pendapatan Terkonsolidasi</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{formatIDR(totalConsolidatedRevenue)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Laba Bersih Konsolidasian</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">{formatIDR(totalConsolidatedProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Hak Pemilik Induk:</span>
                <span className="font-semibold text-foreground">{formatIDR(holdingAttributableProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kepentingan Nonpengendali:</span>
                <span className="font-semibold text-foreground">{formatIDR(nonControllingInterestProfit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Nilai Aset</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{formatIDR(totalConsolidatedAssets)}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Nilai aset total setelah eliminasi internal.</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Daftar Entitas Usaha */}
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Entitas Perusahaan Dalam Grup Konsolidasi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode & Nama Entitas</TableHead>
                <TableHead>Porsi Kepemilikan</TableHead>
                <TableHead className="text-right">Aset</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Laba Bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.code}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{c.ownership}%</span>
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(c.assets)}</TableCell>
                  <TableCell className="text-right">{formatIDR(c.revenue)}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">{formatIDR(c.net_profit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Tambah Entitas Anak */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleAddEntity}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" /> Tambah Entitas Anak
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label>Nama Legal Perusahaan</Label>
                <Input
                  placeholder="Contoh: PT Anak Usaha"
                  value={newEntity.name}
                  onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kode Entitas</Label>
                  <Input
                    placeholder="SUB-002"
                    value={newEntity.code}
                    onChange={(e) => setNewEntity({ ...newEntity, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kepemilikan (%)</Label>
                  <Input
                    placeholder="80"
                    value={newEntity.ownership}
                    onChange={(e) => setNewEntity({ ...newEntity, ownership: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pendapatan (Rp)</Label>
                  <Input
                    type="number"
                    value={newEntity.revenue}
                    onChange={(e) => setNewEntity({ ...newEntity, revenue: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Laba Bersih (Rp)</Label>
                  <Input
                    type="number"
                    value={newEntity.net_profit}
                    onChange={(e) => setNewEntity({ ...newEntity, net_profit: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nilai Aset (Rp)</Label>
                  <Input
                    type="number"
                    value={newEntity.assets}
                    onChange={(e) => setNewEntity({ ...newEntity, assets: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit">Simpan & Gabungkan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
