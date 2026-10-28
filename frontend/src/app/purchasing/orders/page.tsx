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
  Search, Filter, Plus, ShoppingCart, FileText, ChevronDown, Calendar, FolderOpen, Printer, Loader2, Trash2, Edit
} from "lucide-react"
import { api, PurchasingAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = ["Semua", "DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"]

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await PurchasingAPI.getOrders({ limit: 100 })
      setOrders(res?.data || [])
    } catch (err) {
      console.error("Failed to load PO", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string, orderNumber: string) => {
    e.stopPropagation()
    if (!confirm(`Hapus Purchase Order ${orderNumber}?`)) return
    try {
      await api.delete(`/purchasing/orders/${id}`)
      toast({ title: "Purchase Order berhasil dihapus" })
      fetchOrders()
    } catch (err: any) {
      toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" })
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "CONFIRMED": return <Badge className="bg-blue-500/10 text-blue-600 border-0 shadow-none font-medium px-2.5 py-0.5">Disetujui</Badge>
      case "COMPLETED": return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 shadow-none font-medium px-2.5 py-0.5">Selesai</Badge>
      case "DRAFT": return <Badge className="bg-amber-500/10 text-amber-600 border-0 shadow-none font-medium px-2.5 py-0.5">Draft</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const filteredOrders = orders.filter(item => {
    const matchSearch = 
      item.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.name?.toLowerCase().includes(search.toLowerCase())
    
    if (activeTab === "Semua") return matchSearch
    return matchSearch && item.status === activeTab
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            Pesanan Pembelian (PO)
          </h1>
          <p className="text-muted-foreground mt-1">Kelola pesanan ke supplier langsung terhubung ke database riil.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={() => router.push("/reports/purchasing")}>
            <FileText className="h-4 w-4" /> Laporan Pembelian
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => router.push("/purchasing/orders/create")}>
            <Plus className="h-4 w-4" /> Tambah PO
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
            <Button variant="outline" className="gap-2 text-foreground border-border bg-card" onClick={fetchOrders} disabled={loading}>
              <Filter className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} /> Segarkan
            </Button>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nomor atau vendor..." 
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
                  ? 'border-blue-600 text-blue-600 bg-blue-500/10' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {tab === "Semua" ? "Semua Status" : tab}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span>Memuat data Purchase Order...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                <FolderOpen className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Belum ada Purchase Order</h3>
              <p className="text-muted-foreground max-w-sm mb-4 text-xs">
                Mulai dengan membuat Purchase Order (PO) untuk dikirim ke supplier.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => router.push("/purchasing/orders/create")}>
                <Plus className="h-4 w-4 mr-2" /> Buat Purchase Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Nomor PO</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Vendor / Supplier</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Penerimaan (GRN)</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Tagihan (Bill)</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Total Nilai</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Status</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 border-border group cursor-pointer" onClick={() => router.push(`/purchasing/orders/${item.id}`)}>
                      <TableCell className="font-semibold text-blue-600">{item.order_number}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.supplier?.name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{item.order_date ? new Date(item.order_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">{item.receipt_status || 'PENDING'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">{item.bill_status || 'PENDING'}</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-right text-foreground">{formatIDR(Number(item.total_amount) || 0)}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                            onClick={(e) => handleDelete(e, item.id, item.order_number)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
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
