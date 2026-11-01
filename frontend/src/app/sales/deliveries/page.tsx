"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
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
  Search, Filter, Download, Plus, Truck, FileText, ChevronDown, Calendar, FolderOpen, Loader2
} from "lucide-react"
import { B2BApi } from "@/lib/api"

export default function DeliveriesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = ["Semua", "DRAFT", "READY", "DONE", "WAITING", "CANCELLED"]

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    setLoading(true)
    try {
      const res = await B2BApi.getDeliveries({ limit: 100 }).catch(() => [])
      const list = Array.isArray(res) ? res : (res?.data || [])
      setDeliveries(list)
    } catch (err) {
      console.error("Error loading deliveries:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async (id: string) => {
    if (!confirm('Validasi dan terbitkan pengiriman fisik (Surat Jalan)? Stok gudang akan otomatis dipotong sesuai FIFO layer.')) return
    try {
      await B2BApi.validateDelivery(id)
      alert('Pengiriman berhasil divalidasi dan stok fisik telah dipotong!')
      fetchDeliveries()
    } catch (err: any) {
      alert('Gagal memvalidasi pengiriman: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleCancel = async (id: string, isPosted: boolean) => {
    const promptMsg = isPosted 
      ? 'Batalkan pengiriman yang sudah tervalidasi? Sistem akan mengembalikan layer stok FIFO dan membalik jurnal HPP (COGS).'
      : 'Batalkan draf surat jalan ini?'
    if (!confirm(promptMsg)) return
    try {
      await B2BApi.cancelDelivery(id)
      alert('Pengiriman berhasil dibatalkan!')
      fetchDeliveries()
    } catch (err: any) {
      alert('Gagal membatalkan pengiriman: ' + (err.response?.data?.message || err.message))
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "DRAFT": 
      case "WAITING": 
        return <Badge className="bg-amber-500/10 text-amber-700 border-0 font-medium px-2.5 py-0.5">DRAFT</Badge>
      case "READY": 
        return <Badge className="bg-blue-500/10 text-blue-700 border-0 font-medium px-2.5 py-0.5">READY</Badge>
      case "DONE": 
      case "DELIVERED": 
        return <Badge className="bg-emerald-500/10 text-emerald-700 border-0 font-medium px-2.5 py-0.5">DONE</Badge>
      case "CANCELLED": 
        return <Badge className="bg-rose-500/10 text-rose-700 border-0 font-medium px-2.5 py-0.5">CANCELLED</Badge>
      default: 
        return <Badge variant="outline">{status || 'Draft'}</Badge>
    }
  }

  const filtered = deliveries.filter(item => {
    const s = search.toLowerCase()
    const matchesSearch = 
      (item.delivery_number && item.delivery_number.toLowerCase().includes(s)) ||
      (item.customer?.name && item.customer.name.toLowerCase().includes(s)) ||
      (item.tracking_number && item.tracking_number.toLowerCase().includes(s))

    if (!matchesSearch) return false
    if (activeTab !== "Semua" && item.status !== activeTab) return false
    return true
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Truck className="h-6 w-6 text-indigo-600" />
            </div>
            Pengiriman (Surat Jalan)
          </h1>
          <p className="text-muted-foreground mt-1">Kelola surat jalan dan status pengiriman barang ke pelanggan secara real-time.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href="/sales/deliveries/create">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Buat Surat Jalan
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
              placeholder="Cari no surat jalan atau pelanggan..." 
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground font-semibold' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat data surat jalan dari database...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent bg-muted/10">
                    <TableHead className="font-semibold text-foreground pl-6">No. Surat Jalan</TableHead>
                    <TableHead className="font-semibold text-foreground">Pelanggan</TableHead>
                    <TableHead className="font-semibold text-foreground">No. Pesanan (SO)</TableHead>
                    <TableHead className="font-semibold text-foreground">Tanggal Kirim</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                        <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-base font-medium">Belum ada dokumen pengiriman tercatat.</p>
                        <p className="text-xs text-muted-foreground mt-1">Buat surat jalan baru untuk memantau proses pengiriman pesanan.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const isWaiting = item.status === 'WAITING' || item.status === 'READY' || item.status === 'DRAFT'
                      const isDone = item.status === 'DONE' || item.status === 'DELIVERED'
                      const isCancelled = item.status === 'CANCELLED'
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30 border-border transition-colors">
                          <TableCell className="font-semibold text-indigo-600 pl-6">{item.delivery_number || item.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-medium text-foreground">{item.sales_order?.customer?.name || item.customer?.name || item.customer_name || 'Pelanggan Umum'}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{item.sales_order?.order_number || item.order?.order_number || item.reference || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(item.status)}
                          </TableCell>
                          <TableCell className="text-right pr-6 space-x-2">
                            {isWaiting && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleValidate(item.id)}
                                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5"
                                >
                                  Validasi & Terbitkan
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleCancel(item.id, false)}
                                  className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs px-2"
                                >
                                  Batalkan
                                </Button>
                              </>
                            )}
                            {isDone && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleCancel(item.id, true)}
                                className="h-8 text-amber-700 border-amber-300 hover:bg-amber-50 text-xs px-2"
                              >
                                Retur / Reverse
                              </Button>
                            )}
                            {isCancelled && (
                              <span className="text-xs text-muted-foreground italic">Dibatalkan</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
