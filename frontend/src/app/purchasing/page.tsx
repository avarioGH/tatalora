"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, ChevronDown, Download, CheckCircle2, Eye, Edit, Trash2, MoreHorizontal, Plus, Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PurchasingAPI, api } from "@/lib/api"
import { PayVendorBillModal } from "@/components/purchasing/pay-vendor-bill-modal"

export default function PurchasesMainPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [searchTerm, setSearchTerm] = useState("")

  const [invoices, setInvoices] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [rfqs, setRfqs] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<any | null>(null)

  const tabs = [
    "Membutuhkan persetujuan",
    "Ditolak",
    "Semua",
    "Belum Dibayar",
    "Jatuh Tempo",
    "Lunas"
  ]

  useEffect(() => {
    fetchPurchasesData()
  }, [])

  const fetchPurchasesData = async () => {
    setLoading(true)
    try {
      const [invRes, ordRes, rfqRes, recRes] = await Promise.all([
        api.get('/finance/invoices?type=AP&limit=100').catch(() => ({ data: { data: [] } })),
        PurchasingAPI.getOrders({ limit: 100 }).catch(() => ({ data: [] })),
        PurchasingAPI.getRequests().catch(() => ({ data: [] })),
        api.get('/purchasing/receipts').catch(() => ({ data: { data: [] } }))
      ])

      setInvoices(invRes?.data?.data || invRes?.data || [])
      setOrders(ordRes?.data || ordRes || [])
      setRfqs(rfqRes?.data || rfqRes || [])
      setReceipts(recRes?.data?.data || recRes?.data || [])
    } catch (err) {
      console.error("Error fetching purchases data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvoice = async (id: string, no: string) => {
    if (!confirm(`Hapus tagihan pembelian ${no}?`)) return
    try {
      await api.delete(`/finance/invoices/${id}`)
      fetchPurchasesData()
    } catch (e: any) {
      alert("Gagal menghapus tagihan: " + (e.response?.data?.message || e.message))
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  // Summary Metrics calculations
  const now = new Date()
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID')
  const overdueInvoices = invoices.filter(i => i.due_date && new Date(i.due_date) < now && i.status !== 'PAID')
  const paidInvoices = invoices.filter(i => i.status === 'PAID')

  const totalUnpaid = unpaidInvoices.reduce((acc, curr) => acc + (Number(curr.remaining_amount) || Number(curr.outstanding_balance) || Number(curr.total) || 0), 0)
  const totalOverdue = overdueInvoices.reduce((acc, curr) => acc + (Number(curr.remaining_amount) || Number(curr.outstanding_balance) || 0), 0)
  const totalPaid = paidInvoices.reduce((acc, curr) => acc + (Number(curr.paid_amount) || Number(curr.total) || 0), 0)

  // Filter invoices based on selected tab and search term
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.supplier?.name && inv.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    if (activeTab === "Membutuhkan persetujuan") return false
    if (activeTab === "Ditolak") return false
    if (activeTab === "Belum Dibayar") return inv.status !== 'PAID'
    if (activeTab === "Jatuh Tempo") return inv.due_date && new Date(inv.due_date) < now && inv.status !== 'PAID'
    if (activeTab === "Lunas") return inv.status === 'PAID'
    return true
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header persis Jurnal Mekari */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Pembelian
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 px-4 bg-background">
            Impor
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white gap-2 font-medium">
                Buat pembelian baru <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card">
              <DropdownMenuItem onClick={() => router.push("/purchasing/invoices/create")}>
                Faktur pembelian
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/purchasing/invoices/create")}>
                Tukar faktur / Tukar pembelian
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/purchasing/orders/create")}>
                Pemesanan pembelian
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/purchasing/rfqs/create")}>
                Penawaran pembelian
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/purchasing/requests")}>
                Permintaan pembelian
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary KPI Cards Jurnal Mekari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm rounded-md border-border bg-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-muted-foreground">Pembelian belum dibayar</span>
              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                {unpaidInvoices.length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold text-foreground">{formatIDR(totalUnpaid)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-md border-border bg-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-muted-foreground">Pembelian jatuh tempo</span>
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold">
                {overdueInvoices.length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold text-foreground">{formatIDR(totalOverdue)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-md border-border bg-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-muted-foreground">Pelunasan dibayar 30 hari</span>
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                {paidInvoices.length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold text-foreground">{formatIDR(totalPaid)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-md flex items-center justify-center border-dashed border-border bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Kelola Pengeluaran Usaha</p>
            <Link href="/finance/expenses">
              <Button variant="link" className="text-blue-600 text-xs px-0 h-auto">Lihat Biaya Operasional</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Container */}
      <div className="bg-card rounded-md shadow-sm border border-border">
        
        {/* Tab Status Bar */}
        <div className="flex items-center gap-6 px-4 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {t} {t === 'Membutuhkan persetujuan' && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold">0</span>}
            </button>
          ))}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" className="gap-2 bg-background h-9 text-sm">
              Semua Transaksi <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" className="gap-2 bg-background h-9 text-sm">
              Status: {activeTab} <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari transaksi atau vendor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-background h-9 text-sm"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat data pembelian dari database...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] pl-4"><input type="checkbox" className="rounded border-border" /></TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Supplier / Pemasok</TableHead>
                  <TableHead>Tgl Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sisa Tagihan</TableHead>
                  <TableHead className="text-right pr-4">Total</TableHead>
                  <TableHead className="w-[100px] text-right pr-4">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                      <p className="text-base font-medium">Belum ada transaksi pembelian untuk kategori ini.</p>
                      <p className="text-xs mt-1 text-muted-foreground">Klik &quot;Buat pembelian baru&quot; untuk mencatat faktur, pesanan atau penawaran baru.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map(inv => (
                    <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-4"><input type="checkbox" className="rounded border-border" /></TableCell>
                      <TableCell>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('id-ID') : (inv.created_at ? new Date(inv.created_at).toLocaleDateString('id-ID') : '-')}</TableCell>
                      <TableCell className="text-blue-600 font-semibold cursor-pointer hover:underline">
                        {inv.invoice_number || inv.number || 'INV-AP'}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {inv.supplier?.name || inv.vendor?.name || inv.supplier_name || 'Vendor Umum'}
                      </TableCell>
                      <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            inv.status === 'PAID' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-amber-50 text-amber-600 border-amber-200'
                          }
                        >
                          {inv.status === 'PAID' ? 'Lunas' : inv.status === 'PARTIALLY_PAID' ? 'Dibayar Sebagian' : 'Belum Dibayar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIDR(inv.remaining_amount !== undefined ? inv.remaining_amount : (inv.outstanding_balance || 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold pr-4">
                        {formatIDR(inv.total || inv.total_amount || 0)}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1 bg-background text-xs">
                              Tindakan <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-card">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedBill(inv)
                                setPayModalOpen(true)
                              }}
                              className="text-emerald-600 font-medium"
                            >
                              Bayar Tagihan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/purchasing/invoices`)}>
                              Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                              className="text-rose-600 focus:text-rose-600"
                            >
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

      </div>

      {/* Pay Vendor Bill Modal */}
      {selectedBill && (
        <PayVendorBillModal
          open={payModalOpen}
          onOpenChange={setPayModalOpen}
          bill={selectedBill}
          onSuccess={() => {
            setPayModalOpen(false)
            fetchPurchasesData()
          }}
        />
      )}

    </div>
  )
}
