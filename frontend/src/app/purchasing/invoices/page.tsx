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
  Search, Filter, Plus, Receipt, FileText, ChevronDown, Calendar, FolderOpen, Send, Eye, Trash2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { PayVendorBillModal } from "@/components/purchasing/pay-vendor-bill-modal"

export default function PurchaseInvoicesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<any | null>(null)

  const tabs = ["Semua", "Belum Dibayar", "Dibayar Sebagian", "Lunas"]

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const res = await api.get('/finance/invoices?type=AP&limit=100').catch(() => ({ data: { data: [] } }))
      const data = res?.data?.data || res?.data || []
      setInvoices(data)
    } catch (err) {
      console.error("Error loading purchase invoices:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const handleDelete = async (id: string, no: string) => {
    if (!confirm(`Hapus tagihan pembelian ${no}?`)) return
    try {
      await api.delete(`/finance/invoices/${id}`)
      fetchInvoices()
    } catch (e: any) {
      alert("Gagal menghapus tagihan: " + (e.response?.data?.message || e.message))
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplier?.name?.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (activeTab === "Belum Dibayar") return inv.status !== 'PAID' && inv.paid_amount === 0
    if (activeTab === "Dibayar Sebagian") return inv.status === 'PARTIALLY_PAID' || (inv.paid_amount > 0 && inv.status !== 'PAID')
    if (activeTab === "Lunas") return inv.status === 'PAID'
    return true
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Receipt className="h-6 w-6 text-indigo-600" />
            </div>
            Tagihan Pembelian (Vendor Bills)
          </h1>
          <p className="text-muted-foreground mt-1">Kelola faktur tagihan dari vendor, utang usaha, dan pelunasan supplier.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href="/purchasing/invoices/create">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Buat Tagihan Baru
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari no tagihan atau nama vendor..." 
              className="pl-9 bg-muted border-border h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap
                  ${activeTab === tab 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Memuat tagihan pembelian...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Tidak ada tagihan pembelian</h3>
              <p className="text-muted-foreground max-w-sm mb-4 text-xs">
                Catat tagihan pembelian baru dari supplier untuk memantau jatuh tempo utang usaha.
              </p>
              <Link href="/purchasing/invoices/create">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  + Buat Tagihan Pembelian
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"><input type="checkbox" className="rounded border-gray-300" /></TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Tagihan</TableHead>
                  <TableHead>Vendor / Supplier</TableHead>
                  <TableHead>Tgl. Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sisa Utang</TableHead>
                  <TableHead className="text-right">Total Tagihan</TableHead>
                  <TableHead className="text-center">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/30">
                    <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                    <TableCell>{new Date(inv.invoice_date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="font-semibold text-indigo-600">{inv.invoice_number}</TableCell>
                    <TableCell className="font-medium text-foreground">{inv.supplier?.name || '-'}</TableCell>
                    <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}>
                        {inv.status === 'PAID' ? 'Lunas' : inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose-600">{formatIDR(inv.remaining_amount)}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{formatIDR(inv.total)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1">
                            Tindakan <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-card">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBill(inv)
                              setPayModalOpen(true)
                            }}
                            disabled={inv.status === 'PAID'}
                            className="cursor-pointer text-indigo-600 font-semibold focus:bg-indigo-50"
                          >
                            <Send className="w-3.5 h-3.5 mr-2" /> Kirim Pembayaran
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(inv.id, inv.invoice_number)} className="cursor-pointer text-red-600 focus:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay Vendor Bill Modal */}
      <PayVendorBillModal
        open={payModalOpen}
        onOpenChange={setPayModalOpen}
        bill={selectedBill}
        onSuccess={() => fetchInvoices()}
      />
    </div>
  )
}
