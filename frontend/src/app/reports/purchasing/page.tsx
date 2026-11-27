"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  ShoppingCart, CheckCircle2, Clock, ArrowLeft, 
  Search, RefreshCw, Printer
} from "lucide-react"
import { api } from "@/lib/api"

function PurchasingReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOrdersView = searchParams?.get("view") === "orders"
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  
  const [orders, setOrders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const [poRes, invRes, recRes] = await Promise.all([
        api.get('/purchasing/orders?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/finance/invoices?type=AP&limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/purchasing/receipts').catch(() => ({ data: { data: [] } }))
      ])

      setOrders(poRes?.data?.data || poRes?.data || [])
      setInvoices(invRes?.data?.data || invRes?.data || [])
      setReceipts(recRes?.data?.data || recRes?.data || [])
    } catch (err) {
      console.error("Gagal memuat laporan pembelian", err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const formatPoStatus = (st?: string) => {
    switch (st) {
      case 'CONFIRMED': return 'Dikonfirmasi'
      case 'DRAFT': return 'Draf'
      case 'COMPLETED': return 'Selesai'
      case 'CANCELLED': return 'Dibatalkan'
      default: return st || 'Draf'
    }
  }

  const formatReceiptStatus = (st?: string, receivedQty?: number, orderedQty?: number) => {
    if (st === 'RECEIVED' || st === 'FULLY_RECEIVED' || (orderedQty && receivedQty && receivedQty >= orderedQty)) {
      return { label: 'Diterima Penuh', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    }
    if (st === 'PARTIAL' || st === 'PARTIALLY_RECEIVED' || (receivedQty && receivedQty > 0)) {
      return { label: 'Diterima Sebagian', className: 'bg-blue-50 text-blue-700 border-blue-200' }
    }
    return { label: 'Menunggu GRN', className: 'bg-amber-50 text-amber-700 border-amber-200' }
  }

  const formatBillStatus = (st?: string) => {
    switch (st) {
      case 'BILLED':
      case 'FULLY_BILLED':
      case 'INVOICED':
      case 'PAID':
        return { label: 'Sudah Ditagih', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      case 'PARTIAL':
      case 'PARTIALLY_BILLED':
        return { label: 'Ditagih Sebagian', className: 'bg-blue-50 text-blue-700 border-blue-200' }
      default:
        return { label: 'Belum Ditagih', className: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  const computePoFulfillment = (o: any) => {
    const items = Array.isArray(o.items) ? o.items : []
    let orderedQty = items.reduce((sum: number, it: any) => sum + Number(it.quantity ?? it.qty ?? 0), 0)
    let receivedQty = items.reduce((sum: number, it: any) => sum + Number(it.received_qty ?? it.qty_received ?? 0), 0)

    const linkedGrns = receipts.filter((r: any) => r.purchase_order_id === o.id || r.purchase_order?.id === o.id)
    if (receivedQty === 0 && linkedGrns.length > 0) {
      receivedQty = linkedGrns.reduce((sum: number, r: any) => {
        const rItems = Array.isArray(r.items) ? r.items : []
        return sum + rItems.reduce((s: number, ri: any) => s + Number(ri.quantity_received ?? ri.qty_received ?? ri.quantity ?? 0), 0)
      }, 0)
    }

    if (orderedQty === 0) orderedQty = Math.max(receivedQty, 1)
    if (receivedQty === 0 && (o.receipt_status === 'RECEIVED' || o.receipt_status === 'FULLY_RECEIVED' || o.status === 'COMPLETED')) {
      receivedQty = orderedQty
    }

    const remainingQty = Math.max(0, orderedQty - receivedQty)
    const grnNumbers = linkedGrns.map((r: any) => r.receipt_number).filter(Boolean)
    return { orderedQty, receivedQty, remainingQty, grnNumbers }
  }

  const totalPurchaseValue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || Number(o.total) || 0), 0)
  const totalPaid = invoices.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0)
  const totalOutstanding = invoices.reduce((sum, i) => sum + (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0), 0)

  const statusFilterLabels: Record<string, string> = {
    ALL: 'Semua',
    CONFIRMED: 'Dikonfirmasi',
    DRAFT: 'Draf',
    COMPLETED: 'Selesai',
  }

  const filteredOrders = orders.filter(o => {
    const matchSearch = 
      (o.order_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (statusFilter === "ALL") return matchSearch
    return matchSearch && o.status === statusFilter
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button 
            onClick={() => router.push("/reports")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Pusat Laporan
          </button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-teal-600" />
            {isOrdersView ? "Laporan Pemenuhan Pesanan Pembelian (PO)" : "Laporan Analitik Pembelian & Pengadaan"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOrdersView
              ? "Pantau kuantitas pesanan pembelian (PO), penerimaan barang (GRN), dan sisa pesanan yang belum diterima."
              : "Audit rincian pesanan pembelian (PO), pelunasan tagihan pemasok, dan riwayat penerimaan barang."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-card" onClick={fetchReportData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </Button>
          <Button variant="default" className="gap-2 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Cetak / Ekspor PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Nilai Pembelian (PO)</span>
              <div className="p-2 bg-teal-500/10 rounded-lg text-teal-600">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatIDR(totalPurchaseValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{orders.length} Transaksi Pesanan Diterbitkan</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Terbayar ke Pemasok</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatIDR(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">Kas keluar yang telah direalisasikan</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sisa Hutang Usaha (AP)</span>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatIDR(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">Kewajiban pembayaran berjalan</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Cari No. PO atau nama pemasok..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Status PO:</span>
            {['ALL', 'CONFIRMED', 'DRAFT', 'COMPLETED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {statusFilterLabels[st] || st}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Data Pesanan Pembelian */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/40 py-4 px-6 flex justify-between items-center flex-row">
          <div>
            <CardTitle className="text-base font-bold">Rincian Pemenuhan Pesanan Pembelian (Purchase Orders)</CardTitle>
            <CardDescription className="text-xs">Menampilkan kuantitas dipesan, diterima via GRN, sisa kirim, dan status tagihan</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs bg-card">
            {filteredOrders.length} Dokumen
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead>No. Dokumen PO</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead className="text-center">Qty Dipesan</TableHead>
                <TableHead className="text-center">Diterima (GRN)</TableHead>
                <TableHead className="text-center">Sisa PO</TableHead>
                <TableHead>Status PO</TableHead>
                <TableHead>Penerimaan (GRN)</TableHead>
                <TableHead>Tagihan (Faktur)</TableHead>
                <TableHead className="text-right">Total Nilai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Memuat data laporan pembelian...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada transaksi pembelian yang tercatat.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((o) => {
                  const { orderedQty, receivedQty, remainingQty, grnNumbers } = computePoFulfillment(o)
                  const recBadge = formatReceiptStatus(o.receipt_status, receivedQty, orderedQty)
                  const billBadge = formatBillStatus(o.bill_status)

                  return (
                    <TableRow key={o.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/purchasing/orders/${o.id}`)}>
                      <TableCell className="font-semibold text-teal-600">
                        <div>{o.order_number}</div>
                        {grnNumbers.length > 0 && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            GRN: {grnNumbers.join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.order_date ? new Date(o.order_date).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {o.supplier?.name || o.supplier_name || 'Pemasok Umum'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold">
                        {orderedQty}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-emerald-600">
                        {receivedQty}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold">
                        <span className={remainingQty > 0 ? "text-amber-600" : "text-slate-400"}>
                          {remainingQty}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${
                          o.status === 'CONFIRMED' ? 'border-teal-500 text-teal-600 bg-teal-50/50' :
                          o.status === 'DRAFT' ? 'border-amber-500 text-amber-600 bg-amber-50/50' :
                          'border-slate-300 text-slate-600'
                        }`}>
                          {formatPoStatus(o.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${recBadge.className}`}>
                          {recBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${billBadge.className}`}>
                          {billBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {formatIDR(Number(o.total_amount) || 0)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PurchasingReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Memuat laporan pembelian...</div>}>
      <PurchasingReportContent />
    </Suspense>
  )
}
