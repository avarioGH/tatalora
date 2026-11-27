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
  TrendingUp, Wallet, ChevronRight, 
  Download, FileText, ShoppingCart, Truck, Receipt, ArrowLeft, Search
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts"
import { api } from "@/lib/api"

function SalesReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOrdersView = searchParams?.get("view") === "orders"
  const [activeView, setActiveView] = useState<"summary" | "orders">(isOrdersView ? "orders" : "summary")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [ordersList, setOrdersList] = useState<any[]>([])
  const [deliveriesList, setDeliveriesList] = useState<any[]>([])
  const [data, setData] = useState({
    quotations: 0,
    orders: 0,
    deliveries: 0,
    invoices: 0,
    totalReceivables: 0,
    totalSales: 0,
    trendData: [] as any[],
    rasioLunasData: [] as any[],
    salesPersonData: [] as any[]
  })

  useEffect(() => {
    setActiveView(isOrdersView ? "orders" : "summary")
  }, [isOrdersView])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [qRes, oRes, iRes, dRes] = await Promise.all([
        api.get('/sales/quotations?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/sales/orders?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/finance/invoices?type=AR&limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/sales/deliveries?limit=1000').catch(() => ({ data: { data: [] } }))
      ])

      const quotations = qRes.data?.data || qRes.data || []
      const orders = oRes.data?.data || oRes.data || []
      const invoices = iRes.data?.data || iRes.data || []
      const deliveries = dRes.data?.data || dRes.data || []

      setOrdersList(Array.isArray(orders) ? orders : [])
      setDeliveriesList(Array.isArray(deliveries) ? deliveries : [])

      const totalSales = orders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || Number(o.total) || 0), 0)
      const totalReceivables = invoices.reduce((sum: number, i: any) => sum + (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0), 0)
      
      const lunasCount = invoices.filter((i: any) => i.status === 'PAID').length
      const belumCount = Math.max(0, invoices.length - lunasCount)
      const rasioLunasData = [
        { name: 'Lunas', value: lunasCount, color: '#10b981' },
        { name: 'Belum Lunas', value: belumCount, color: '#f59e0b' }
      ]

      const monthlyData: any = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
      
      orders.forEach((o: any) => {
        const orderDateStr = o.order_date || o.created_at || o.createdAt
        if (!orderDateStr) return
        const d = new Date(orderDateStr)
        if (isNaN(d.getTime())) return
        const m = monthNames[d.getMonth()]
        if (!monthlyData[m]) monthlyData[m] = { name: m, tagihan: 0, pemesanan: 0 }
        monthlyData[m].pemesanan += Number(o.total_amount) || Number(o.total) || 0
      })

      invoices.forEach((i: any) => {
        const invDateStr = i.invoice_date || i.created_at || i.createdAt
        if (!invDateStr) return
        const d = new Date(invDateStr)
        if (isNaN(d.getTime())) return
        const m = monthNames[d.getMonth()]
        if (!monthlyData[m]) monthlyData[m] = { name: m, tagihan: 0, pemesanan: 0 }
        monthlyData[m].tagihan += Number(i.total) || Number(i.total_amount) || 0
      })

      const trendData = Object.values(monthlyData)

      const customerMap: Record<string, number> = {}
      orders.forEach((o: any) => {
        const custName = o.customer?.name || 'Pelanggan Umum'
        customerMap[custName] = (customerMap[custName] || 0) + (Number(o.total_amount) || Number(o.total) || 0)
      })
      const salesPersonData = Object.keys(customerMap).length > 0
        ? Object.entries(customerMap).slice(0, 5).map(([name, value]) => ({ name, value }))
        : [{ name: 'Penjualan Langsung', value: totalSales }]

      setData({
        quotations: quotations.length,
        orders: orders.length,
        deliveries: deliveries.length || orders.filter((o: any) => o.status === 'SHIPPED' || o.delivery_status === 'DELIVERED').length,
        invoices: invoices.length,
        totalSales,
        totalReceivables,
        trendData: trendData.length > 0 ? trendData : [{name: 'Bulan Ini', tagihan: 0, pemesanan: 0}],
        rasioLunasData,
        salesPersonData
      })

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0)
  }

  const formatDeliveryStatus = (st?: string) => {
    switch (st) {
      case 'DELIVERED':
      case 'SHIPPED':
      case 'COMPLETED':
        return { label: 'Terkirim Penuh', className: 'border-emerald-500 text-emerald-700 bg-emerald-50' }
      case 'PARTIAL':
      case 'PARTIALLY_DELIVERED':
      case 'PARTIALLY_SHIPPED':
        return { label: 'Terkirim Sebagian', className: 'border-blue-500 text-blue-700 bg-blue-50' }
      default:
        return { label: 'Belum Dikirim', className: 'border-amber-500 text-amber-700 bg-amber-50' }
    }
  }

  const formatInvoiceStatus = (st?: string) => {
    switch (st) {
      case 'INVOICED':
      case 'FULLY_INVOICED':
      case 'PAID':
        return { label: 'Sudah Ditagih', className: 'border-emerald-500 text-emerald-700 bg-emerald-50' }
      case 'PARTIAL':
      case 'PARTIALLY_INVOICED':
        return { label: 'Ditagih Sebagian', className: 'border-blue-500 text-blue-700 bg-blue-50' }
      default:
        return { label: 'Belum Ditagih', className: 'border-slate-300 text-slate-700 bg-slate-50' }
    }
  }

  const computeOrderRealization = (o: any) => {
    const items = Array.isArray(o.items) ? o.items : []
    let orderedQty = items.reduce((sum: number, it: any) => sum + Number(it.quantity ?? it.qty ?? 0), 0)
    let deliveredQty = items.reduce((sum: number, it: any) => sum + Number(it.delivered_qty ?? it.shipped_qty ?? 0), 0)

    if (orderedQty === 0) orderedQty = 1

    const linkedDeliveries = deliveriesList.filter((d: any) => d.sales_order_id === o.id || d.sales_order?.id === o.id)
    if (deliveredQty === 0 && linkedDeliveries.length > 0) {
      deliveredQty = linkedDeliveries.reduce((sum: number, d: any) => {
        const dItems = Array.isArray(d.items) ? d.items : []
        return sum + dItems.reduce((s: number, di: any) => s + Number(di.quantity ?? di.qty ?? 0), 0)
      }, 0)
    }

    if (deliveredQty === 0 && (o.delivery_status === 'DELIVERED' || o.status === 'COMPLETED' || o.status === 'SHIPPED')) {
      deliveredQty = orderedQty
    }

    const remainingQty = Math.max(0, orderedQty - deliveredQty)
    return { orderedQty, deliveredQty, remainingQty, doCount: linkedDeliveries.length }
  }

  const filteredOrders = ordersList.filter((o: any) => {
    const q = searchTerm.toLowerCase()
    return (
      !q ||
      o.order_number?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat laporan analitik penjualan...</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/reports')}><ArrowLeft className="w-4 h-4"/></Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {activeView === "orders" ? "Laporan Realisasi Pesanan Penjualan (SO)" : "Laporan Penjualan"}
            </h1>
            <p className="text-muted-foreground">
              {activeView === "orders"
                ? "Pantau pemenuhan kuantitas pesanan penjualan, jumlah terkirim (DO), dan sisa kirim per nomor SO"
                : "Ringkasan performa penjualan bisnis Anda berdasarkan data aktual"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => {
                setActiveView("summary")
                router.replace("/reports/sales")
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeView === "summary" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ringkasan Analitik
            </button>
            <button
              onClick={() => {
                setActiveView("orders")
                router.replace("/reports/sales?view=orders")
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeView === "orders" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Realisasi Pesanan (SO)
            </button>
          </div>
          <Button variant="outline" className="bg-white" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Ekspor Laporan
          </Button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Penjualan (Pesanan)" 
          value={formatCurrency(data.totalSales)} 
          trend="Aktual" 
          trendUp={true} 
          subtitle="Berdasarkan Sales Order aktif"
          icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
          colorClass="bg-indigo-100"
        />
        <SummaryCard 
          title="Total Piutang Berjalan" 
          value={formatCurrency(data.totalReceivables)} 
          trend="Aktual" 
          trendUp={false} 
          subtitle="Nilai tagihan yang belum lunas"
          icon={<Wallet className="w-6 h-6 text-rose-600" />}
          colorClass="bg-rose-100"
          trendColor="text-rose-500"
        />
        <SummaryCard 
          title="Total Faktur Tagihan" 
          value={data.invoices} 
          trend="Status" 
          trendUp={true} 
          subtitle="Dokumen faktur tercipta"
          icon={<Receipt className="w-6 h-6 text-emerald-600" />}
          colorClass="bg-emerald-100"
        />
        <SummaryCard 
          title="Konversi Pemesanan" 
          value={data.orders} 
          trend="Status" 
          trendUp={true} 
          subtitle="Total Pemesanan (SO) dikonfirmasi"
          icon={<ShoppingCart className="w-6 h-6 text-amber-600" />}
          colorClass="bg-amber-100"
        />
      </div>

      {activeView === "summary" && (
        <>
          {/* Pipeline Visualizer */}
          <div className="mt-8 mb-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Alur Transaksi Penjualan</h3>
            <Card className="shadow-sm ring-1 ring-border border-0 overflow-hidden">
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                <PipelineStep title="Penawaran" count={data.quotations} label="Total Penawaran" icon={<FileText className="w-7 h-7 text-indigo-500" />} bgColor="bg-indigo-50" active={true} />
                
                <div className="hidden md:flex flex-col items-center justify-center -mx-4 z-10 w-8">
                  <div className="w-8 h-8 rounded-full bg-white border border-border shadow-sm flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <PipelineStep title="Pemesanan" count={data.orders} label="Pesanan Aktif" icon={<ShoppingCart className="w-7 h-7 text-emerald-500" />} bgColor="bg-emerald-50" active={true} />
                
                <div className="hidden md:flex flex-col items-center justify-center -mx-4 z-10 w-8">
                  <div className="w-8 h-8 rounded-full bg-white border border-border shadow-sm flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <PipelineStep title="Pengiriman" count={data.deliveries} label="Surat Jalan (DO)" icon={<Truck className="w-7 h-7 text-amber-500" />} bgColor="bg-amber-50" active={true} />
                
                <div className="hidden md:flex flex-col items-center justify-center -mx-4 z-10 w-8">
                  <div className="w-8 h-8 rounded-full bg-white border border-border shadow-sm flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <PipelineStep title="Tagihan" count={data.invoices} label="Faktur Terbit" icon={<Receipt className="w-7 h-7 text-rose-500" />} bgColor="bg-rose-50" active={true} />
              </div>
            </Card>
          </div>

          {/* Charts Section 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border-0 ring-1 ring-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Tren Pemesanan vs Tagihan</CardTitle>
                    <CardDescription>Performa bulanan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTagihan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPemesanan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val: any) => 'Rp ' + (val/1000000).toFixed(0) + 'M'} />
                    <RechartsTooltip 
                      formatter={(val: any) => 'Rp ' + val.toLocaleString('id-ID')}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="tagihan" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTagihan)" name="Tagihan" />
                    <Area type="monotone" dataKey="pemesanan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPemesanan)" name="Pemesanan" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 ring-1 ring-border">
              <CardHeader>
                <CardTitle className="text-lg">Rasio Lunas Tagihan</CardTitle>
                <CardDescription>Berdasarkan kuantitas faktur</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-80 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.rasioLunasData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.rasioLunasData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-muted-foreground">Lunas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-muted-foreground">Belum Lunas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Realisasi Pesanan Penjualan Table (Always visible in ?view=orders and below summary) */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/40 py-4 px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="text-base font-bold">Rincian Realisasi & Sisa Kirim Pesanan Penjualan (Sales Orders)</CardTitle>
            <CardDescription className="text-xs">
              Pantau kuantitas dipesan, kuantitas terkirim (Surat Jalan / DO), sisa kirim, dan status penagihan per nomor SO
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari No. SO atau pelanggan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 bg-card text-xs"
              />
            </div>
            <Badge variant="outline" className="text-xs bg-card">
              {filteredOrders.length} Pesanan
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead>No. Pesanan (SO)</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="text-center">Qty Dipesan</TableHead>
                <TableHead className="text-center">Qty Terkirim</TableHead>
                <TableHead className="text-center">Sisa Kirim</TableHead>
                <TableHead>Status Pengiriman</TableHead>
                <TableHead>Status Tagihan</TableHead>
                <TableHead className="text-right">Nilai Pesanan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Belum ada pesanan penjualan (SO) yang tercatat.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((o: any) => {
                  const { orderedQty, deliveredQty, remainingQty } = computeOrderRealization(o)
                  const delivBadge = formatDeliveryStatus(
                    remainingQty === 0 && deliveredQty > 0
                      ? 'DELIVERED'
                      : deliveredQty > 0
                      ? 'PARTIAL'
                      : o.delivery_status
                  )
                  const invBadge = formatInvoiceStatus(o.invoice_status)

                  return (
                    <TableRow
                      key={o.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/sales/orders/${o.id}`)}
                    >
                      <TableCell className="font-semibold text-indigo-600 hover:underline">
                        {o.order_number}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.order_date ? new Date(o.order_date).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {o.customer?.name || 'Pelanggan Umum'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold">
                        {orderedQty}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-emerald-600">
                        {deliveredQty}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold">
                        <span className={remainingQty > 0 ? "text-amber-600" : "text-slate-400"}>
                          {remainingQty}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${delivBadge.className}`}>
                          {delivBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${invBadge.className}`}>
                          {invBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {formatCurrency(Number(o.total_amount) || Number(o.total) || 0)}
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

export default function SalesReportReal() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Memuat laporan...</div>}>
      <SalesReportContent />
    </Suspense>
  )
}

function SummaryCard({ title, value, trend, trendUp, subtitle, icon, colorClass, trendColor }: any) {
  const isPositive = trendUp;
  const tColor = trendColor || (isPositive ? 'text-emerald-500' : 'text-rose-500');
  
  return (
    <Card className="border-0 shadow-sm ring-1 ring-border/50 hover:shadow-md transition-all duration-200 overflow-hidden group relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/0 to-slate-100/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2.5 rounded-xl ${colorClass}`}>
            {icon}
          </div>
          <Badge variant="outline" className={`bg-card/50 border-border ${tColor} font-semibold`}>
            {trend}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground tracking-tight">{value}</h3>
          <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function PipelineStep({ title, count, label, icon, bgColor, active }: any) {
  return (
    <div className={`flex-1 p-6 ${active ? 'hover:bg-muted/80 transition-colors cursor-pointer' : 'opacity-60'} flex flex-col items-center justify-center text-center group`}>
      <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-background`}>
        {icon}
      </div>
      <h4 className="text-foreground font-semibold mb-1">{title}</h4>
      <div className="flex flex-col items-center mt-1">
        <span className="text-2xl font-bold tracking-tight text-foreground mb-1">{count}</span>
        <span className="text-xs font-medium text-muted-foreground max-w-[120px] leading-tight">{label}</span>
      </div>
    </div>
  )
}
