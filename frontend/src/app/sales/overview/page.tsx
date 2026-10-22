"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, Wallet, Clock, AlertCircle, ChevronRight, 
  Download, FileText, ShoppingCart, Truck, Receipt, Calendar, Users, Loader2
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts"
import { api, B2BApi } from "@/lib/api"

export default function SalesOverviewPage() {
  const router = useRouter()
  const [timeFilter, setTimeFilter] = useState("Bulan")
  const [loading, setLoading] = useState(true)

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    quotationsCount: 0,
    ordersCount: 0,
    deliveriesCount: 0,
    invoicesCount: 0,
    lunasPercentage: 100,
    trendData: [] as { name: string; tagihan: number; pemesanan: number }[],
    rasioLunasData: [
      { name: 'Lunas', value: 1, color: '#10b981' },
      { name: 'Belum Lunas', value: 0, color: '#e2e8f0' }
    ],
    customerSalesData: [] as { name: string; value: number }[],
  })

  useEffect(() => {
    fetchRealSalesData()
  }, [])

  const fetchRealSalesData = async () => {
    setLoading(true)
    try {
      const [invRes, ordRes, quoRes, delRes] = await Promise.all([
        api.get('/finance/invoices?type=SALES&limit=1000').catch(() => ({ data: { data: [] } })),
        B2BApi.getOrders({ limit: 1000 }).catch(() => ({ data: [] })),
        B2BApi.getQuotations({ limit: 1000 }).catch(() => ({ data: [] })),
        B2BApi.getDeliveries({ limit: 1000 }).catch(() => ({ data: [] }))
      ])

      const invoices: any[] = invRes?.data?.data || []
      const orders: any[] = ordRes?.data || []
      const quotations: any[] = quoRes?.data || []
      const deliveries: any[] = delRes?.data || []

      // Totals calculation
      const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
      const paidAmount = invoices.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0)
      const pendingAmount = invoices.reduce((sum, i) => sum + (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0), 0)

      // Overdue invoices
      const now = new Date()
      const overdueAmount = invoices
        .filter(i => i.due_date && new Date(i.due_date) < now && (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0) > 0)
        .reduce((sum, i) => sum + (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0), 0)

      // Ratio lunas
      const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.total) || Number(i.total_amount) || 0), 0)
      const lunasPct = totalInvoiced > 0 ? Math.round((paidAmount / totalInvoiced) * 100) : (totalSales > 0 ? 0 : 100)
      const rasioData = [
        { name: 'Lunas', value: paidAmount > 0 ? paidAmount : (totalInvoiced === 0 ? 1 : 0), color: '#10b981' },
        { name: 'Belum Lunas', value: pendingAmount, color: '#e2e8f0' }
      ]

      // Monthly Trend (6 bulan terakhir)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
      const last6Months: { name: string; tagihan: number; pemesanan: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        last6Months.push({
          name: monthNames[d.getMonth()],
          tagihan: 0,
          pemesanan: 0
        })
      }

      orders.forEach(o => {
        if (!o.order_date) return
        const od = new Date(o.order_date)
        const mName = monthNames[od.getMonth()]
        const target = last6Months.find(m => m.name === mName)
        if (target) {
          target.pemesanan += Number(o.total_amount) || 0
        }
      })

      invoices.forEach(i => {
        const dt = i.invoice_date || i.created_at
        if (!dt) return
        const idt = new Date(dt)
        const mName = monthNames[idt.getMonth()]
        const target = last6Months.find(m => m.name === mName)
        if (target) {
          target.tagihan += Number(i.total) || Number(i.total_amount) || 0
        }
      })

      // Customer sales aggregation
      const customerMap: Record<string, number> = {}
      orders.forEach(o => {
        const cName = o.customer?.name || o.customer_name || 'Pelanggan Umum'
        customerMap[cName] = (customerMap[cName] || 0) + (Number(o.total_amount) || 0)
      })

      const customerSalesData = Object.entries(customerMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      setMetrics({
        totalSales,
        paidAmount,
        pendingAmount,
        overdueAmount,
        quotationsCount: quotations.length,
        ordersCount: orders.length,
        deliveriesCount: deliveries.length,
        invoicesCount: invoices.length,
        lunasPercentage: lunasPct,
        trendData: last6Months,
        rasioLunasData: rasioData,
        customerSalesData
      })
    } catch (err) {
      console.error("Failed to load real sales data", err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            TATALORA <span className="font-light text-muted-foreground mx-2">|</span> Overview Penjualan
          </h1>
          <p className="text-muted-foreground mt-1">Pantau performa penjualan, tagihan, dan pembayaran bisnis Anda secara real-time.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-card rounded-lg p-1 border shadow-sm">
            {['Hari', 'Bulan', 'Tahun'].map(filter => (
              <button 
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeFilter === filter 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <Button variant="outline" className="gap-2 bg-card" onClick={fetchRealSalesData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <SummaryCard 
          title="Total Penjualan" 
          value={formatIDR(metrics.totalSales)} 
          trend={`${metrics.ordersCount} Pesanan`} 
          trendUp={true}
          subtitle="Akumulasi real-time" 
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />} 
          colorClass="bg-blue-500/10 border-blue-500/20"
        />
        <SummaryCard 
          title="Pembayaran Diterima" 
          value={formatIDR(metrics.paidAmount)} 
          trend="Lunas" 
          trendUp={true}
          subtitle="Total penerimaan kas" 
          icon={<Wallet className="h-5 w-5 text-emerald-600" />} 
          colorClass="bg-emerald-500/10 border-emerald-500/20"
        />
        <SummaryCard 
          title="Menunggu Pembayaran" 
          value={formatIDR(metrics.pendingAmount)} 
          trend="Piutang Aktif" 
          trendUp={false}
          subtitle="Sisa tagihan pelanggan" 
          icon={<Clock className="h-5 w-5 text-amber-600" />} 
          colorClass="bg-amber-500/10 border-amber-500/20"
        />
        <SummaryCard 
          title="Jatuh Tempo" 
          value={formatIDR(metrics.overdueAmount)} 
          trend="Perlu Ditagih" 
          trendUp={false}
          trendColor="text-rose-500"
          subtitle="Lewat tempo pembayaran" 
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />} 
          colorClass="bg-rose-500/10 border-rose-500/20"
        />
      </div>

      {/* Alur Penjualan (Pipeline) - Terkoneksi ke Sub-modul */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-400" /> 
            Alur Penjualan (Pipeline)
          </h3>
          <span className="text-xs text-slate-400 font-medium">Klik pada langkah untuk membuka modul terkait</span>
        </div>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row w-full divide-y md:divide-y-0 md:divide-x divide-border">
            
            <PipelineStep 
              title="Penawaran" 
              count={metrics.quotationsCount} 
              label="Dokumen penawaran" 
              icon={<FileText className="h-6 w-6 text-indigo-500" />} 
              bgColor="bg-indigo-500/10" 
              active={true}
              onClick={() => router.push("/sales/quotations")}
            />
            
            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>

            <PipelineStep 
              title="Pemesanan (SO)" 
              count={metrics.ordersCount} 
              label="Pesanan penjualan" 
              icon={<ShoppingCart className="h-6 w-6 text-sky-500" />} 
              bgColor="bg-sky-500/10" 
              active={true}
              onClick={() => router.push("/sales/orders")}
            />
            
            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>

            <PipelineStep 
              title="Pengiriman (DO)" 
              count={metrics.deliveriesCount} 
              label="Surat jalan & logistik" 
              icon={<Truck className="h-6 w-6 text-amber-500" />} 
              bgColor="bg-amber-500/10" 
              active={true}
              onClick={() => router.push("/sales/deliveries")}
            />
            
            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>

            <PipelineStep 
              title="Faktur & Tagihan" 
              count={metrics.invoicesCount} 
              label="Invoice penagihan" 
              icon={<Receipt className="h-6 w-6 text-emerald-500" />} 
              bgColor="bg-emerald-500/10" 
              active={true}
              onClick={() => router.push("/sales/invoices")}
            />
            
          </div>
        </CardContent>
      </Card>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Tren Tagihan & Pemesanan</CardTitle>
            <CardDescription>Performa penjualan & penagihan riil per bulan</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip 
                  formatter={(val: any) => formatIDR(Number(val) || 0)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="tagihan" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTagihan)" name="Tagihan" />
                <Area type="monotone" dataKey="pemesanan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPemesanan)" name="Pemesanan" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Rasio Lunas Piutang</CardTitle>
            <CardDescription>Persentase tagihan lunas vs belum dibayar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-80 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
              <span className="text-4xl font-bold text-foreground">{metrics.lunasPercentage}%</span>
              <span className="text-sm text-muted-foreground font-medium">Tertelusuri</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.rasioLunasData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics.rasioLunasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-muted-foreground font-medium">Lunas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                <span className="text-xs text-muted-foreground font-medium">Sisa Piutang</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 2 - Real Customer Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Pelanggan Berdasarkan Transaksi</CardTitle>
            <CardDescription>Akumulasi volume pesanan penjualan pelanggan</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {metrics.customerSalesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.customerSalesData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} width={120} />
                  <RechartsTooltip 
                    formatter={(val: any) => formatIDR(Number(val) || 0)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={22} name="Total Pesanan" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-8 bg-muted rounded-xl border border-dashed border-border w-full h-full flex flex-col items-center justify-center">
                <Users className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-muted-foreground text-sm font-medium">Belum ada data pesanan pelanggan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Buat Sales Order pertama untuk melihat peringkat pelanggan.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Akses Cepat Modul Penjualan</CardTitle>
              <CardDescription>Pusat operasional dan transaksi penjualan</CardDescription>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div 
              onClick={() => router.push("/sales/orders/create")} 
              className="p-3.5 rounded-xl border border-border hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  +
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Buat Pesanan Penjualan (SO) Baru</h4>
                  <p className="text-xs text-muted-foreground">Input pesanan baru dari pelanggan secara langsung</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div 
              onClick={() => router.push("/sales/invoices/create")} 
              className="p-3.5 rounded-xl border border-border hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  📄
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Terbitkan Faktur Penagihan</h4>
                  <p className="text-xs text-muted-foreground">Kirimkan invoice resmi ke pelanggan Anda</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div 
              onClick={() => router.push("/reports/sales")} 
              className="p-3.5 rounded-xl border border-border hover:border-purple-500 hover:bg-purple-50/50 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  📊
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Laporan Analitik Penjualan Lengkap</h4>
                  <p className="text-xs text-muted-foreground">Detail realisasi pesanan, margin keuntungan, dan riwayat</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

function SummaryCard({ title, value, trend, trendUp, subtitle, icon, colorClass, trendColor }: any) {
  const isPositive = trendUp;
  const tColor = trendColor || (isPositive ? 'text-emerald-500' : 'text-slate-600');
  
  return (
    <Card className="border shadow-sm ring-1 ring-border/50 hover:shadow-md transition-all duration-200 overflow-hidden group relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/0 to-slate-100/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2.5 rounded-xl ${colorClass}`}>
            {icon}
          </div>
          <Badge variant="outline" className={`bg-card border-border ${tColor} font-semibold text-xs`}>
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

function PipelineStep({ title, count, label, icon, bgColor, active, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex-1 p-6 ${active ? 'hover:bg-muted/80 transition-colors cursor-pointer' : 'opacity-60'} flex flex-col items-center justify-center text-center group`}
    >
      <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-background`}>
        {icon}
      </div>
      <h4 className="text-foreground font-semibold mb-1">{title}</h4>
      <div className="flex flex-col items-center mt-1">
        <span className="text-2xl font-bold tracking-tight text-foreground mb-1">{count}</span>
        <span className="text-xs font-medium text-muted-foreground max-w-[140px] leading-tight">{label}</span>
      </div>
    </div>
  )
}
