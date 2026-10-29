"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, Filter, Plus, FileText, ChevronDown, Calendar, FolderOpen, 
  Printer, Upload, Download, RefreshCw, Loader2, ArrowUpRight
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function SalesInvoicesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = ["Semua", "Belum Dibayar", "Dibayar Sebagian", "Lunas"]

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/finance/invoices?type=AR')
      const invoices = Array.isArray(res.data) ? res.data : res.data?.data || []
      setData(invoices)
    } catch (err) {
      console.error("Error fetching sales invoices:", err)
      toast.error("Gagal memuat daftar tagihan penjualan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter logic
  const filteredData = data.filter((item) => {
    // 1. Tab filter
    if (activeTab === "Belum Dibayar") {
      const isUnpaid = item.status === "UNPAID" || item.status === "Belum Dibayar" || (Number(item.remaining_amount) > 0 && !item.paid_amount)
      if (!isUnpaid) return false
    } else if (activeTab === "Dibayar Sebagian") {
      const isPartial = item.status === "PARTIALLY PAID" || item.status === "Dibayar Sebagian" || (Number(item.paid_amount) > 0 && Number(item.remaining_amount) > 0)
      if (!isPartial) return false
    } else if (activeTab === "Lunas") {
      const isPaid = item.status === "PAID" || item.status === "Lunas" || Number(item.remaining_amount) === 0
      if (!isPaid) return false
    }

    // 2. Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const invNum = (item.invoice_number || "").toLowerCase()
      const custName = (item.customer?.name || "").toLowerCase()
      const ref = (item.client_ref || item.reference || "").toLowerCase()
      return invNum.includes(q) || custName.includes(q) || ref.includes(q)
    }

    return true
  })

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const headers = ["Nomor Tagihan", "Pelanggan", "Tanggal Transaksi", "Jatuh Tempo", "Status", "Sisa Tagihan", "Total Tagihan"]
    const rows = filteredData.map(inv => [
      `"${inv.invoice_number || '-'}"`,
      `"${inv.customer?.name || '-'}"`,
      `"${new Date(inv.invoice_date).toLocaleDateString('id-ID')}"`,
      `"${inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}"`,
      `"${inv.status || 'UNPAID'}"`,
      Number(inv.remaining_amount ?? inv.total ?? 0),
      Number(inv.total ?? 0)
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `tagihan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("File CSV berhasil diekspor!")
  }

  const getStatusBadge = (status: string, remaining: number) => {
    if (remaining === 0 || status === "PAID" || status === "Lunas") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 font-medium px-2.5 py-0.5">Lunas</Badge>
    }
    if (status === "PARTIALLY PAID" || status === "Dibayar Sebagian") {
      return <Badge className="bg-amber-500/10 text-amber-600 border-0 font-medium px-2.5 py-0.5">Dibayar Sebagian</Badge>
    }
    return <Badge className="bg-rose-500/10 text-rose-600 border-0 font-medium px-2.5 py-0.5">Belum Dibayar</Badge>
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            Tagihan Penjualan
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola faktur invoice penagihan ke pelanggan, pantau status pembayaran, dan umur piutang.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportCSV} className="bg-card gap-2 shadow-xs text-foreground border-border">
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <Button variant="outline" onClick={() => window.print()} className="bg-card gap-2 shadow-xs text-foreground border-border hidden sm:flex">
            <Printer className="h-4 w-4" /> Cetak
          </Button>

          <Link href="/sales/invoices/create">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
              <Plus className="h-4 w-4" /> Buat Penagihan Baru
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border shadow-xs overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 text-foreground border-border bg-card">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nomor tagihan, pelanggan..." 
                className="pl-9 bg-muted border-border h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-muted/30 px-4 pt-3 border-b border-border flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap
                ${activeTab === tab 
                  ? 'border-primary text-primary bg-primary/10' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Memuat data tagihan penjualan dari database...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Tidak ada tagihan penjualan</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Belum ada data tagihan yang sesuai dengan filter atau kata kunci "{search}".
              </p>
              <Link href="/sales/invoices/create">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-2">
                  <Plus className="h-4 w-4" /> Buat Penagihan Penjualan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className="font-semibold text-foreground">Nomor Faktur</TableHead>
                    <TableHead className="font-semibold text-foreground">Pelanggan</TableHead>
                    <TableHead className="font-semibold text-foreground">Tgl. Transaksi</TableHead>
                    <TableHead className="font-semibold text-foreground">Tgl. Jatuh Tempo</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Sisa Tagihan</TableHead>
                    <TableHead className="font-semibold text-foreground text-right pr-6">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const total = Number(item.total || item.total_amount || 0)
                    const remaining = Number(item.remaining_amount ?? total)

                    return (
                      <TableRow 
                        key={item.id} 
                        className="hover:bg-muted/30 border-border group cursor-pointer"
                        onClick={() => router.push(`/sales/invoices/${item.id}`)}
                      >
                        <TableCell className="font-semibold text-primary">
                          {item.invoice_number || item.id}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.customer?.name || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(item.invoice_date).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID') : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(item.status, remaining)}
                        </TableCell>
                        <TableCell className="text-rose-500 font-semibold text-right">
                          {formatIDR(remaining)}
                        </TableCell>
                        <TableCell className="text-foreground font-bold text-right pr-6">
                          {formatIDR(total)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
