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
  Search, Filter, Plus, Truck, FileText, ChevronDown, Calendar, FolderOpen, Printer, Upload, Loader2, ArrowRight
} from "lucide-react"
import { api } from "@/lib/api"

export default function PurchaseReceiptsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = ["Semua", "COMPLETED", "DRAFT", "CANCELLED"]

  const fetchReceipts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/purchasing/receipts').catch(() => ({ data: { data: [] } }))
      const data = res?.data?.data || res?.data || []
      setReceipts(data)
    } catch (err) {
      console.error("Error loading receipts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReceipts()
  }, [])

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "COMPLETED":
      case "Selesai": 
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 font-medium px-2.5 py-0.5">Selesai Masuk</Badge>
      case "DRAFT": 
        return <Badge className="bg-amber-500/10 text-amber-600 border-0 font-medium px-2.5 py-0.5">Proses Bongkar</Badge>
      default: 
        return <Badge variant="outline">{status || 'Selesai'}</Badge>
    }
  }

  const filtered = receipts.filter(item => {
    const matchSearch = 
      item.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.purchase_order?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.name?.toLowerCase().includes(search.toLowerCase())
    
    if (activeTab === "Semua") return matchSearch
    return matchSearch && (item.status === activeTab)
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 rounded-lg">
              <Truck className="h-6 w-6 text-teal-600" />
            </div>
            Pengiriman & Penerimaan Pembelian (GRN)
          </h1>
          <p className="text-muted-foreground mt-1">Pencatatan fisik barang masuk dari supplier terhubung langsung ke inventaris stok.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={() => router.push("/purchasing/orders")}>
            <FileText className="h-4 w-4" /> Buka Daftar PO
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2 text-foreground border-border bg-card" onClick={fetchReceipts} disabled={loading}>
              <Filter className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} /> Segarkan
            </Button>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nomor GRN atau vendor..." 
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
                  ? 'border-teal-600 text-teal-600 bg-teal-500/10' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {tab === "COMPLETED" ? "Selesai" : tab === "DRAFT" ? "Draft" : tab}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <span>Memuat data penerimaan fisik barang...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-teal-500/10 flex items-center justify-center">
                <Truck className="h-9 w-9 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Penerimaan Barang (GRN)</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Barang masuk otomatis tercatat di sini saat Anda menekan tombol "Terima Barang" pada rincian Pesanan Pembelian (PO).
              </p>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm gap-2" onClick={() => router.push("/purchasing/orders")}>
                Lihat Pesanan Pembelian (PO) <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground">Nomor Bukti</TableHead>
                    <TableHead className="font-semibold text-foreground">Vendor / Supplier</TableHead>
                    <TableHead className="font-semibold text-foreground">Ref. Pesanan (PO)</TableHead>
                    <TableHead className="font-semibold text-foreground">Tanggal Diterima</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Gudang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 border-border">
                      <TableCell className="font-semibold text-teal-600">{item.receipt_number || item.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.supplier?.name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.purchase_order?.order_number || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.receipt_date || item.created_at ? new Date(item.receipt_date || item.created_at).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-foreground">{item.warehouse?.name || 'Gudang Utama'}</TableCell>
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
