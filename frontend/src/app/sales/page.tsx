"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, ChevronDown, Download, CheckCircle2, X, Eye, Edit, Trash2, MoreHorizontal, Upload, FileSpreadsheet, Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { B2BApi, api } from "@/lib/api"
import { ReceivePaymentModal } from "@/components/sales/receive-payment-modal"
import { Wallet } from "lucide-react"
import { downloadCSV, parseCSV } from "@/lib/csv-helper"

export default function UnifiedSalesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Penagihan")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("Semua")

  const [invoices, setInvoices] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null)

  // Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDeleteInvoice = async (id: string, number: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus tagihan ${number}?`)) return
    try {
      await api.delete(`/finance/invoices/${id}`)
      fetchData()
    } catch (err: any) {
      alert("Gagal menghapus tagihan: " + (err.response?.data?.message || err.message))
    }
  }

  const handleDeleteOrder = async (id: string, number: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pesanan ${number}?`)) return
    try {
      await B2BApi.deleteOrder(id)
      fetchData()
    } catch (err: any) {
      alert("Gagal menghapus pesanan: " + (err.response?.data?.message || err.message))
    }
  }

  const handleDeleteQuotation = async (id: string, number: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus penawaran ${number}?`)) return
    try {
      await B2BApi.deleteQuotation(id)
      fetchData()
    } catch (err: any) {
      alert("Gagal menghapus penawaran: " + (err.response?.data?.message || err.message))
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [invRes, ordRes, quoRes, delRes] = await Promise.all([
        api.get('/finance/invoices?type=AR&limit=100').catch(() => ({ data: { data: [] } })),
        B2BApi.getOrders({ limit: 100 }).catch(() => ({ data: [] })),
        B2BApi.getQuotations({ limit: 100 }).catch(() => ({ data: [] })),
        B2BApi.getDeliveries({ limit: 100 }).catch(() => ({ data: [] }))
      ])
      
      setInvoices(invRes?.data?.data || invRes?.data || [])
      setOrders(ordRes?.data?.data || ordRes?.data || [])
      setQuotations(quoRes?.data?.data || quoRes?.data || [])
      setDeliveries(delRes?.data?.data || delRes?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  // Filter Helper for Invoices
  const getFilteredInvoices = () => {
    return invoices.filter(inv => {
      const matchesSearch = 
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.customer?.name && inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
      if (!matchesSearch) return false

      if (selectedStatus === "Semua") return true
      if (selectedStatus === "Belum Dibayar") return inv.status === 'UNPAID' || inv.status === 'DRAFT'
      if (selectedStatus === "Dibayar Sebagian") return inv.status === 'PARTIAL' || inv.status === 'PARTIALLY PAID'
      if (selectedStatus === "Lunas") return inv.status === 'PAID'
      if (selectedStatus === "Jatuh Tempo") {
        return inv.status !== 'PAID' && inv.due_date && new Date(inv.due_date) < new Date()
      }
      return true
    })
  }

  // Filter Helper for Orders
  const getFilteredOrders = () => {
    return orders.filter(o => {
      const matchesSearch = 
        (o.order_number && o.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
      if (!matchesSearch) return false

      if (selectedStatus === "Semua") return true
      if (selectedStatus === "Lunas") return o.status === 'COMPLETED' || o.status === 'PAID'
      if (selectedStatus === "Belum Dibayar") return o.status !== 'COMPLETED' && o.status !== 'PAID'
      return o.status === selectedStatus
    })
  }

  // Filter Helper for Quotations
  const getFilteredQuotations = () => {
    return quotations.filter(q => {
      const matchesSearch = 
        (q.quotation_number && q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.customer?.name && q.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
      if (!matchesSearch) return false

      if (selectedStatus === "Semua") return true
      return q.status === selectedStatus
    })
  }

  // Export CSV Handler
  const handleExportCSV = () => {
    if (activeTab === "Penagihan") {
      const filtered = getFilteredInvoices()
      const headers = ["Tanggal", "No. Transaksi", "Pelanggan", "Tgl. Jatuh Tempo", "Status", "Sisa Tagihan", "Total"]
      const rows = filtered.map(i => [
        new Date(i.invoice_date).toLocaleDateString('id-ID'),
        i.invoice_number || '',
        i.customer?.name || '-',
        i.due_date ? new Date(i.due_date).toLocaleDateString('id-ID') : '-',
        i.status === 'PAID' ? 'Lunas' : i.status,
        i.remaining_amount || 0,
        i.total || 0
      ])
      downloadCSV(`penagihan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    } else if (activeTab === "Pesanan") {
      const filtered = getFilteredOrders()
      const headers = ["Tanggal", "No. Pesanan", "Pelanggan", "Status", "Status Pengiriman", "Status Tagihan", "Total"]
      const rows = filtered.map(o => [
        new Date(o.order_date).toLocaleDateString('id-ID'),
        o.order_number || '',
        o.customer?.name || '-',
        o.status || '',
        o.delivery_status || '',
        o.invoice_status || '',
        o.total_amount || 0
      ])
      downloadCSV(`pesanan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    } else if (activeTab === "Penawaran") {
      const filtered = getFilteredQuotations()
      const headers = ["Tanggal", "No. Penawaran", "Pelanggan", "Status", "Total"]
      const rows = filtered.map(q => [
        new Date(q.quotation_date).toLocaleDateString('id-ID'),
        q.quotation_number || '',
        q.customer?.name || '-',
        q.status || '',
        q.total_amount || 0
      ])
      downloadCSV(`penawaran_penjualan_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    } else {
      const filtered = deliveries.filter(d => d.delivery_number?.toLowerCase().includes(searchTerm.toLowerCase()))
      const headers = ["Tanggal", "No. Pengiriman", "No. Pesanan", "Supir", "Plat", "Status"]
      const rows = filtered.map(d => [
        new Date(d.delivery_date).toLocaleDateString('id-ID'),
        d.delivery_number || '',
        d.sales_order?.order_number || '-',
        d.driver_name || '-',
        d.vehicle_plate || '-',
        d.status || ''
      ])
      downloadCSV(`pengiriman_penjualan_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
    }
  }

  // Template Download Handler
  const handleDownloadTemplate = () => {
    const headers = ["Nomor Tagihan", "Tanggal (YYYY-MM-DD)", "Jatuh Tempo (YYYY-MM-DD)", "Nama Pelanggan", "Deskripsi Barang", "Kuantitas", "Harga Satuan", "Pajak"]
    const sampleRows = [
      ["INV/2026/001", "2026-10-29", "2026-11-29", "PT Maju Bersama", "Jasa Konsultasi", "1", "15000000", "0"],
      ["INV/2026/002", "2026-10-29", "2026-11-15", "CV Berkah Jaya", "Material Kayu Meranti", "10", "450000", "0"]
    ]
    downloadCSV("template_impor_penjualan.csv", headers, sampleRows)
  }

  // File Upload & Preview Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        const parsed = parseCSV(text)
        setImportPreview(parsed)
      }
    }
    reader.readAsText(file)
  }

  // Process Import Submission
  const handleProcessImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) {
      alert("Tidak ada baris data untuk diimpor.")
      return
    }

    setImporting(true)
    try {
      const payloadInvoices = importPreview.rows.map(row => {
        const invNum = row[0] || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        const date = row[1] || new Date().toISOString().slice(0, 10)
        const due = row[2] || undefined
        const desc = row[4] || "Item Penjualan"
        const qty = Number(row[5]) || 1
        const price = Number(row[6]) || 0
        const tax = Number(row[7]) || 0
        const subtotal = qty * price
        const total = subtotal + tax

        return {
          type: "AR",
          invoice_number: invNum,
          invoice_date: date,
          due_date: due,
          subtotal,
          tax,
          total,
          status: "UNPAID",
          items: [
            {
              description: desc,
              qty,
              unit_price: price,
              subtotal
            }
          ]
        }
      })

      await api.post("/finance/invoices/bulk-import", { invoices: payloadInvoices })
      alert(`Berhasil mengimpor ${payloadInvoices.length} data tagihan!`)
      setImportModalOpen(false)
      setImportFile(null)
      setImportPreview(null)
      fetchData()
    } catch (err: any) {
      console.error(err)
      alert("Gagal mengimpor data: " + (err.response?.data?.message || err.message))
    } finally {
      setImporting(false)
    }
  }

  const renderTabContent = () => {
    if (loading) return <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Memuat data dari database...</div>

    if (activeTab === "Penagihan") {
      const filtered = getFilteredInvoices()
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"><input type="checkbox" className="rounded border-gray-300" /></TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No.</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Tgl. jatuh tempo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sisa tagihan</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Tidak ada data penagihan yang cocok</TableCell></TableRow>
            ) : filtered.map(inv => (
              <TableRow key={inv.id}>
                <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                <TableCell>{new Date(inv.invoice_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{inv.invoice_number}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{inv.customer?.name || '-'}</TableCell>
                <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}>
                    {inv.status === 'PAID' ? 'Lunas' : inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{formatIDR(inv.remaining_amount)}</TableCell>
                <TableCell className="text-right font-medium">{formatIDR(inv.total)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        Tindakan <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-card">
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedInvoiceForPayment(inv);
                          setPaymentModalOpen(true);
                        }} 
                        disabled={inv.status === 'PAID'}
                        className="cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 font-medium"
                      >
                        <Wallet className="w-3.5 h-3.5 mr-2" /> Terima Pembayaran
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/sales/invoices/${inv.id}`)} className="cursor-pointer">
                        <Eye className="w-3.5 h-3.5 mr-2" /> Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (activeTab === "Pesanan") {
      const filtered = getFilteredOrders()
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"><input type="checkbox" className="rounded border-gray-300" /></TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Pesanan</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Status Pengiriman</TableHead>
              <TableHead>Status Tagihan</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Tidak ada data pesanan yang cocok</TableCell></TableRow>
            ) : filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                <TableCell>{new Date(o.order_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{o.order_number}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{o.customer?.name || '-'}</TableCell>
                <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                <TableCell><Badge variant="outline">{o.delivery_status}</Badge></TableCell>
                <TableCell><Badge variant="outline">{o.invoice_status}</Badge></TableCell>
                <TableCell className="text-right font-medium">{formatIDR(o.total_amount)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        Tindakan <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-card">
                      <DropdownMenuItem onClick={() => router.push(`/sales/orders`)} className="cursor-pointer">
                        <Eye className="w-3.5 h-3.5 mr-2" /> Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteOrder(o.id, o.order_number)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (activeTab === "Penawaran") {
      const filtered = getFilteredQuotations()
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"><input type="checkbox" className="rounded border-gray-300" /></TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Penawaran</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada penawaran</TableCell></TableRow>
            ) : filtered.map(q => (
              <TableRow key={q.id}>
                <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                <TableCell>{new Date(q.quotation_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{q.quotation_number}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{q.customer?.name || '-'}</TableCell>
                <TableCell><Badge variant="outline">{q.status}</Badge></TableCell>
                <TableCell className="text-right font-medium">{formatIDR(q.total_amount)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        Tindakan <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-card">
                      <DropdownMenuItem onClick={() => router.push(`/sales/quotations`)} className="cursor-pointer">
                        <Eye className="w-3.5 h-3.5 mr-2" /> Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteQuotation(q.id, q.quotation_number)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }
    
    if (activeTab === "Pengiriman") {
      const filtered = deliveries.filter(d => d.delivery_number?.toLowerCase().includes(searchTerm.toLowerCase()))
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"><input type="checkbox" className="rounded border-gray-300" /></TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Pengiriman</TableHead>
              <TableHead>No. Pesanan</TableHead>
              <TableHead>Supir</TableHead>
              <TableHead>Plat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada pengiriman</TableCell></TableRow>
            ) : filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                <TableCell>{new Date(d.delivery_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{d.delivery_number}</TableCell>
                <TableCell className="text-muted-foreground">{d.sales_order?.order_number || '-'}</TableCell>
                <TableCell>{d.driver_name || '-'}</TableCell>
                <TableCell>{d.vehicle_plate || '-'}</TableCell>
                <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="h-8">Tindakan <ChevronDown className="w-3 h-3 ml-1" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    return <div className="p-8 text-center text-muted-foreground">Belum ada data untuk tab ini.</div>
  }

  const tabs = ["Penagihan", "Pengiriman", "Pesanan", "Penawaran", "Membutuhkan persetujuan", "Ditolak"]
  const statusOptions = ["Semua", "Belum Dibayar", "Dibayar Sebagian", "Lunas", "Jatuh Tempo"]

  // Calculating stats for header
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + (Number(i.remaining_amount) || 0), 0)
  const overdueInvoices = invoices.filter(i => i.status !== 'PAID' && i.due_date && new Date(i.due_date) < new Date()).reduce((sum, i) => sum + (Number(i.remaining_amount) || 0), 0)
  const paid30Days = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (Number(i.paid_amount) || Number(i.total) || 0), 0)

  return (
    <div className="space-y-6 pb-10">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Penjualan</h1>
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Export Button */}
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            className="bg-background gap-1.5 h-9"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Ekspor CSV</span>
          </Button>

          {/* Import Button */}
          <Button 
            variant="outline" 
            onClick={() => setImportModalOpen(true)}
            className="bg-background gap-1.5 h-9"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span>Impor</span>
          </Button>

          {/* Create Transaction Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 h-9 shadow-sm cursor-pointer">
              <span>Buat penjualan baru</span>
              <ChevronDown className="w-4 h-4 ml-1 opacity-90" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-md border-border bg-card">
              <DropdownMenuItem onClick={() => router.push('/sales/invoices/create')} className="py-2.5 cursor-pointer">
                Penagihan Penjualan (Invoice)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/sales/orders/create')} className="py-2.5 cursor-pointer">
                Pemesanan Penjualan (SO)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/sales/quotations/create')} className="py-2.5 cursor-pointer">
                Penawaran Penjualan (Quotation)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/sales/deliveries/create')} className="py-2.5 cursor-pointer">
                Surat Jalan / Pengiriman
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/sales/invoice-exchanges/create')} className="py-2.5 cursor-pointer font-medium text-indigo-600 dark:text-indigo-400">
                Tukar Faktur Penjualan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Receive Payment Modal */}
      <ReceivePaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        invoice={selectedInvoiceForPayment}
        onSuccess={() => fetchData()}
      />

      {/* Import CSV Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Impor Transaksi Penjualan
            </DialogTitle>
            <DialogDescription>
              Unggah file CSV untuk mengimpor tagihan penjualan secara massal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
              <div>
                <p className="text-sm font-medium">Format Template CSV Mekari Jurnal</p>
                <p className="text-xs text-muted-foreground">Unduh format kolom yang sesuai standar sistem</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Unduh Template
              </Button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Klik untuk memilih file CSV</p>
              <p className="text-xs text-muted-foreground mt-1">
                {importFile ? importFile.name : "Mendukung format .csv"}
              </p>
            </div>

            {importPreview && importPreview.rows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Pratinjau ({importPreview.rows.length} baris terdeteksi):
                </p>
                <div className="max-h-48 overflow-auto border rounded text-xs">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        {importPreview.headers.map((h, i) => (
                          <th key={i} className="p-2 text-left font-medium border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-b">
                          {row.map((cell, ci) => (
                            <td key={ci} className="p-2">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setImportModalOpen(false)}>
                Batal
              </Button>
              <Button 
                onClick={handleProcessImport} 
                disabled={!importPreview || importPreview.rows.length === 0 || importing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                Proses Impor ({importPreview?.rows.length || 0})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-amber-500 shadow-sm rounded-md">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-semibold text-foreground">Penagihan belum dibayar</p>
              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">{invoices.filter(i=>i.status!=='PAID').length}</div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold">{formatIDR(unpaidInvoices)}</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-rose-500 shadow-sm rounded-md bg-rose-50/30">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-semibold text-foreground">Penagihan telat dibayar</p>
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold">{invoices.filter(i=>i.status!=='PAID' && i.due_date && new Date(i.due_date) < new Date()).length}</div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold">{formatIDR(overdueInvoices)}</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 shadow-sm rounded-md bg-emerald-50/30">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-semibold text-foreground">Pelunasan diterima 30 hari terakhir</p>
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">{invoices.filter(i=>i.status==='PAID').length}</div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold">{formatIDR(paid30Days)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm rounded-md flex items-center justify-center border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Terima pembayaran lebih cepat</p>
            <Button variant="link" className="text-indigo-600 text-xs px-0 h-auto">Info selengkapnya</Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Container */}
      <div className="bg-background rounded-md shadow-sm border border-border">
        
        {/* Tabs */}
        <div className="flex items-center gap-6 px-4 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => {
                setActiveTab(t)
                setSelectedStatus("Semua")
              }}
              className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
            >
              {t} {t === 'Membutuhkan persetujuan' && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold">0</span>}
            </button>
          ))}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* Status Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-background h-9 text-sm">
                  <span>Status: {selectedStatus}</span>
                  <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card shadow-md">
                {statusOptions.map(st => (
                  <DropdownMenuItem 
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`cursor-pointer ${selectedStatus === st ? 'font-bold text-indigo-600' : ''}`}
                  >
                    {st}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
          
          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={`Cari di ${activeTab}...`} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-background h-9"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {renderTabContent()}
        </div>

      </div>

    </div>
  )
}
