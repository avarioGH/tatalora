"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  RotateCcw, Search, Filter, Plus, FileText, Printer, Loader2, ArrowRight, CreditCard, RefreshCw
} from "lucide-react"
import { PurchasingAPI } from "@/lib/api"

export default function PurchaseReturnsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const tabs = ["Semua", "DRAFT", "POSTED", "REVERSED"]

  const fetchReturns = async () => {
    try {
      setLoading(true)
      const data = await PurchasingAPI.getPurchaseReturns()
      setReturns(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReturns()
  }, [])

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "POSTED": 
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 font-medium px-2.5 py-0.5">Disetujui (POSTED)</Badge>
      case "REVERSED": 
        return <Badge className="bg-rose-500/10 text-rose-600 border-0 font-medium px-2.5 py-0.5">Dibatalkan (REVERSED)</Badge>
      default: 
        return <Badge className="bg-amber-500/10 text-amber-600 border-0 font-medium px-2.5 py-0.5">Draft Pengajuan</Badge>
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const filtered = returns.filter(item => {
    const matchSearch = 
      item.return_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.reference_po?.toLowerCase().includes(search.toLowerCase())
    
    if (activeTab === "Semua") return matchSearch
    return matchSearch && (item.status === activeTab)
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <RotateCcw className="h-6 w-6 text-rose-600" />
            </div>
            Retur Pembelian (Purchase Return)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pengembalian barang rusak atau tidak sesuai ke vendor beserta penyesuaian debit hutang usaha.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={() => router.push("/purchasing/credit-notes")}>
            <CreditCard className="h-4 w-4 text-purple-600" /> Nota Kredit Supplier
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={() => router.push("/purchasing/orders")}>
            <FileText className="h-4 w-4" /> Daftar PO
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2" onClick={() => router.push("/purchasing/orders")}>
            <Plus className="h-4 w-4" /> Buat Retur dari PO
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={fetchReturns}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nomor retur atau vendor..." 
                className="pl-9 bg-muted border-border h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-muted/30 px-4 pt-3 border-b border-border flex gap-1 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap
                ${activeTab === tab 
                  ? 'border-rose-600 text-rose-600 bg-rose-500/10' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {tab === "COMPLETED" ? "Selesai" : tab === "CONFIRMED" ? "Disetujui" : tab === "DRAFT" ? "Draft" : tab}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
              <span>Memuat data retur pembelian...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
                <RotateCcw className="h-9 w-9 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Retur Pembelian</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Retur pembelian dibuat jika terdapat barang cacat/rusak yang diterima dari vendor untuk memotong tagihan atau menerima pengembalian dana.
              </p>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm gap-2" onClick={() => router.push("/purchasing/orders")}>
                Pilih dari Pesanan Pembelian (PO) <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground">Nomor Retur</TableHead>
                    <TableHead className="font-semibold text-foreground">Vendor / Supplier</TableHead>
                    <TableHead className="font-semibold text-foreground">Ref. PO</TableHead>
                    <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Nilai Retur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 border-border">
                      <TableCell className="font-semibold text-rose-600">{item.return_number}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.supplier?.name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.reference_po || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.date ? new Date(item.date).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
