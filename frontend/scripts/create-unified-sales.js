const fs = require('fs');
const path = require('path');

const salesPageCode = `"use client"

import React, { useState, useEffect } from "react"
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
  Search, ChevronDown, Download, CheckCircle2, X
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { B2BApi, api } from "@/lib/api"

export default function UnifiedSalesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Penagihan")
  const [searchTerm, setSearchTerm] = useState("")

  const [invoices, setInvoices] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [invRes, ordRes, quoRes, delRes] = await Promise.all([
        api.get('/finance/invoices?limit=100').catch(() => ({ data: { data: [] } })),
        B2BApi.getOrders({ limit: 100 }).catch(() => ({ data: [] })),
        B2BApi.getQuotations({ limit: 100 }).catch(() => ({ data: [] })),
        B2BApi.getDeliveries({ limit: 100 }).catch(() => ({ data: [] }))
      ])
      
      setInvoices(invRes?.data?.data || [])
      setOrders(ordRes?.data || [])
      setQuotations(quoRes?.data || [])
      setDeliveries(delRes?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const renderTabContent = () => {
    if (loading) return <div className="p-8 text-center text-muted-foreground">Memuat data...</div>

    if (activeTab === "Penagihan") {
      const filtered = invoices.filter(i => i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()))
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
              <TableHead>Tag</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Tidak ada penagihan</TableCell></TableRow>
            ) : filtered.map(inv => (
              <TableRow key={inv.id}>
                <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                <TableCell>{new Date(inv.invoice_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{inv.invoice_number}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{inv.customer?.name || '-'}</TableCell>
                <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}>
                    {inv.status === 'PAID' ? 'Dibayar' : inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatIDR(inv.remaining_amount)}</TableCell>
                <TableCell className="text-right">{formatIDR(inv.total)}</TableCell>
                <TableCell></TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="h-8">Tindakan <ChevronDown className="w-3 h-3 ml-1" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (activeTab === "Pesanan") {
      const filtered = orders.filter(o => o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()))
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
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Tidak ada pesanan</TableCell></TableRow>
            ) : filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                <TableCell>{new Date(o.order_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{o.order_number}</TableCell>
                <TableCell className="text-indigo-600 font-medium">{o.customer?.name || '-'}</TableCell>
                <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                <TableCell><Badge variant="outline">{o.delivery_status}</Badge></TableCell>
                <TableCell><Badge variant="outline">{o.invoice_status}</Badge></TableCell>
                <TableCell className="text-right">{formatIDR(o.total_amount)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => router.push(\`/sales/orders\`)}>Detail</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (activeTab === "Penawaran") {
      const filtered = quotations.filter(q => q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <TableCell className="text-right">{formatIDR(q.total_amount)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => router.push(\`/sales/quotations\`)}>Detail</Button>
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
                <TableCell>
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

  // Calculating stats for header
  const unpaidInvoices = invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + i.remaining_amount, 0)
  const overdueInvoices = invoices.filter(i => i.status !== 'PAID' && i.due_date && new Date(i.due_date) < new Date()).reduce((sum, i) => sum + i.remaining_amount, 0)
  const paid30Days = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.paid_amount, 0)

  return (
    <div className="space-y-6 pb-10">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Penjualan</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-background gap-2">
            Impor <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
          <DropdownMenu>
            <div className="flex rounded-md shadow-sm">
              <Button onClick={() => router.push('/sales/invoices/create')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-none border-r border-indigo-500">
                Buat penjualan baru
              </Button>
              <DropdownMenuTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-none px-2">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/sales/invoices/create')} className="py-2 cursor-pointer">Penagihan Penjualan</DropdownMenuItem>
              <DropdownMenuItem className="py-2 cursor-pointer">Tukar Faktur</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/sales/orders')} className="py-2 cursor-pointer">Pemesanan Penjualan</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/sales/quotations')} className="py-2 cursor-pointer">Penawaran Penjualan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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

      <div className="bg-background rounded-md shadow-sm border border-border">
        
        {/* Tabs */}
        <div className="flex items-center gap-6 px-4 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={\`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors \${activeTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}\`}
            >
              {t} {t === 'Membutuhkan persetujuan' && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold">0</span>}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" className="gap-2 bg-background h-9">
              {activeTab} <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" className="gap-2 bg-background h-9">
              Semua status <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Pencarian..." 
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
`

const dir = path.join(__dirname, '../src/app/sales');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'page.tsx'), salesPageCode, 'utf8');

console.log("Created unified sales page");
