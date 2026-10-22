"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, FileText, CheckCircle, Clock, AlertCircle, ChevronRight, 
  Download, Box, Receipt, Truck, Users, Calendar, Loader2
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts"
import { api } from "@/lib/api"

export default function PurchasingOverviewPage() {
  const router = useRouter()
  const [filter, setFilter] = useState("Bulan")
  const [loading, setLoading] = useState(true)

  const [metrics, setMetrics] = useState({
    totalPurchasing: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    rfqsCount: 0,
    ordersCount: 0,
    receiptsCount: 0,
    billsCount: 0,
    lunasPercentage: 100,
    trendData: [] as { name: string; tagihan: number; pesanan: number }[],
    rasioLunasData: [
      { name: 'Lunas', value: 1, color: '#10b981' },
      { name: 'Belum Lunas', value: 0, color: '#e2e8f0' }
    ],
    vendorData: [] as { name: string; value: number }[],
  })

  useEffect(() => {
    fetchRealPurchasingData()
  }, [])

  const fetchRealPurchasingData = async () => {
    setLoading(true)
    try {
      const [poRes, recRes, invRes, rfqRes] = await Promise.all([
        api.get('/purchasing/orders?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/purchasing/receipts').catch(() => ({ data: { data: [] } })),
        api.get('/finance/invoices?type=AP&limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/purchasing/requests?limit=1000').catch(() => ({ data: { data: [] } }))
      ])

      const orders: any[] = poRes?.data?.data || []
      const receipts: any[] = recRes?.data?.data || []
      const invoices: any[] = invRes?.data?.data || []
      const rfqs: any[] = rfqRes?.data?.data || []

      // Calculations
      const totalPurchasing = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
      const paidAmount = invoices.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0)
      const pendingAmount = invoices.reduce((sum, i) => sum + (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0), 0)

      // Overdue bills
      const now = new Date()
      const overdueAmount = invoices
        .filter(i => i.due_date && new Date(i.due_date) < now && (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0) > 0)
        .reduce((sum, i) => sum + (Number(i.remaining_amount) || Number(i.outstanding_balance) || 0), 0)

      const totalBilled = invoices.reduce((sum, i) => sum + (Number(i.total) || Number(i.total_amount) || 0), 0)
      const lunasPct = totalBilled > 0 ? Math.round((paidAmount / totalBilled) * 100) : (totalPurchasing > 0 ? 0 : 100)

      const rasioLunasData = [
        { name: 'Lunas', value: paidAmount > 0 ? paidAmount : (totalBilled === 0 ? 1 : 0), color: '#10b981' },
        { name: 'Belum Lunas', value: pendingAmount, color: '#e2e8f0' }
      ]

      // Monthly Trend (6 bulan terakhir)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
      const last6Months: { name: string; tagihan: number; pesanan: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        last6Months.push({
          name: monthNames[d.getMonth()],
          tagihan: 0,
          pesanan: 0
        })
      }

      orders.forEach(o => {
        if (!o.order_date) return
        const od = new Date(o.order_date)
        const mName = monthNames[od.getMonth()]
        const target = last6Months.find(m => m.name === mName)
        if (target) {
          target.pesanan += Number(o.total_amount) || 0
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

      // Top Vendors
      const vendorMap: Record<string, number> = {}
      orders.forEach(o => {
        const sName = o.supplier?.name || o.supplier_name || 'Vendor Umum'
        vendorMap[sName] = (vendorMap[sName] || 0) + (Number(o.total_amount) || 0)
      })

      const vendorData = Object.entries(vendorMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      setMetrics({
        totalPurchasing,
        paidAmount,
        pendingAmount,
        overdueAmount,
        rfqsCount: rfqs.length,
        ordersCount: orders.length,
        receiptsCount: receipts.length,
        billsCount: invoices.length,
        lunasPercentage: lunasPct,
        trendData: last6Months,
        rasioLunasData,
        vendorData
      })
    } catch (err) {
      console.error("Failed to load real purchasing data", err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShoppingCart className="h-7 w-7 text-teal-600" />
            TATALORA <span className="text-muted-foreground font-normal">| Overview Pembelian</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Pantau pengeluaran modal, tagihan supplier, dan performa vendor secara real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card border border-border rounded-lg p-1">
            {['Hari', 'Bulan', 'Tahun'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === f ? 'bg-teal-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="outline" className="gap-2 bg-card border-border shadow-sm" onClick={fetchRealPurchasingData} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Pembelian" 
          value={formatIDR(metrics.totalPurchasing)} 
          trend={`${metrics.ordersCount} Pesanan PO`} 
          trendUp={true}
          subtitle="Akumulasi pesanan pembelian" 
          icon={<ShoppingCart className="w-5 h-5 text-teal-600" />} 
          colorClass="bg-teal-500/10"
        />
        <SummaryCard 
          title="Pembayaran Dikirim" 
          value={formatIDR(metrics.paidAmount)} 
          trend="Lunas" 
          trendUp={true}
          subtitle="Kas keluar ke vendor" 
          icon={<CheckCircle className="w-5 h-5 text-indigo-600" />} 
          colorClass="bg-indigo-500/10"
        />
        <SummaryCard 
          title="Menunggu Pembayaran" 
          value={formatIDR(metrics.pendingAmount)} 
          trend="Hutang Usaha" 
          trendUp={false}
          subtitle="Tagihan vendor belum dibayar" 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          colorClass="bg-amber-500/10"
          trendColor="text-amber-500"
        />
        <SummaryCard 
          title="Jatuh Tempo" 
          value={formatIDR(metrics.overdueAmount)} 
          trend="Segera Bayar" 
          trendUp={false}
          subtitle="Lewat tempo pembayaran" 
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />} 
          colorClass="bg-rose-500/10"
          trendColor="text-rose-500"
        />
      </div>

      {/* Pipeline Row (Alur Pembelian) */}
      <Card className="border shadow-sm ring-1 ring-border bg-card overflow-hidden">
        <CardHeader className="border-b border-border bg-slate-900 text-white pb-4 flex justify-between items-center">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Box className="w-4 h-4 text-teal-400" /> Alur Pembelian (Procurement Flow)
          </CardTitle>
          <span className="text-xs text-slate-400 font-medium">Klik pada langkah untuk membuka modul terkait</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-stretch divide-y md:divide-y-0 md:divide-x divide-border">
            
            <PipelineStep 
              title="Permintaan & RFQ" 
              count={metrics.rfqsCount} 
              label="Penawaran harga supplier" 
              icon={<FileText className="w-6 h-6 text-amber-500" />}
              bgColor="bg-amber-500/10 dark:bg-amber-500/20"
              active={true}
              onClick={() => router.push("/purchasing/rfqs")}
            />

            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>

            <PipelineStep 
              title="Pesanan Pembelian (PO)" 
              count={metrics.ordersCount} 
              label="PO diterbitkan ke vendor" 
              icon={<ShoppingCart className="w-6 h-6 text-teal-500" />}
              bgColor="bg-teal-500/10 dark:bg-teal-500/20"
              active={true}
              onClick={() => router.push("/purchasing/orders")}
            />

            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>

            <PipelineStep 
              title="Penerimaan Barang (GRN)" 
              count={metrics.receiptsCount} 
              label="Stok masuk ke gudang" 
              icon={<Truck className="w-6 h-6 text-indigo-500" />}
              bgColor="bg-indigo-500/10 dark:bg-indigo-500/20"
              active={true}
              onClick={() => router.push("/purchasing/receipts")}
            />

            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>

            <PipelineStep 
              title="Tagihan Vendor (AP)" 
              count={metrics.billsCount} 
              label="Faktur tagihan vendor" 
              icon={<Receipt className="w-6 h-6 text-rose-500" />}
              bgColor="bg-rose-500/10 dark:bg-rose-500/20"
              active={true}
              onClick={() => router.push("/purchasing/invoices")}
            />

          </div>
        </CardContent>
      </Card>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border ring-1 ring-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Tren Tagihan vs Pesanan Pembelian</CardTitle>
            <CardDescription>Realisasi pengeluaran bulanan sepanjang tahun</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTagihan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPesanan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip 
                  formatter={(val: any) => formatIDR(Number(val) || 0)}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="tagihan" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorTagihan)" name="Tagihan Vendor" />
                <Area type="monotone" dataKey="pesanan" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPesanan)" name="Pesanan PO" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border ring-1 ring-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Rasio Pembayaran Hutang</CardTitle>
            <CardDescription>Pelunasan tagihan pembelian vendor</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-80 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
              <span className="text-4xl font-bold text-foreground">{metrics.lunasPercentage}%</span>
              <span className="text-xs text-muted-foreground font-medium mt-1">Lunas Dibayar</span>
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
                <span className="text-xs text-muted-foreground font-medium">Hutang Aktif</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 2 - Real Vendor Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border ring-1 ring-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Vendor / Supplier Utama</CardTitle>
            <CardDescription>Berdasarkan total volume pembelian PO</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {metrics.vendorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.vendorData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} width={120} />
                  <RechartsTooltip 
                    formatter={(val: any) => formatIDR(Number(val) || 0)}
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }} 
                  />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={22} name="Total Pembelian" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-8 bg-muted rounded-xl border border-dashed border-border w-full h-full flex flex-col items-center justify-center">
                <Users className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-muted-foreground text-sm font-medium">Belum ada data transaksi vendor</p>
                <p className="text-xs text-muted-foreground mt-0.5">Buat Purchase Order pertama untuk memetakan vendor utama.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border ring-1 ring-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Akses Cepat Pengadaan</CardTitle>
              <CardDescription>Tindakan cepat untuk operasional logistik & pembelian</CardDescription>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div 
              onClick={() => router.push("/purchasing/orders/create")} 
              className="p-3.5 rounded-xl border border-border hover:border-teal-500 hover:bg-teal-50/50 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  +
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Terbitkan Purchase Order (PO) Baru</h4>
                  <p className="text-xs text-muted-foreground">Pesan stok barang baku atau produk ke supplier</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div 
              onClick={() => router.push("/purchasing/receipts")} 
              className="p-3.5 rounded-xl border border-border hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  📦
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Penerimaan Barang (GRN)</h4>
                  <p className="text-xs text-muted-foreground">Konfirmasi kedatangan fisik barang ke inventori gudang</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div 
              onClick={() => router.push("/reports/purchasing")} 
              className="p-3.5 rounded-xl border border-border hover:border-amber-500 hover:bg-amber-50/50 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  📋
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Laporan Pembelian & Audit Belanja</h4>
                  <p className="text-xs text-muted-foreground">Daftar rincian PO, status penerimaan, dan faktur supplier</p>
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
  const tColor = trendColor || (isPositive ? 'text-teal-600' : 'text-rose-500');

  return (
    <Card className="border shadow-sm ring-1 ring-border/50 hover:shadow-md transition-all duration-200 overflow-hidden group relative bg-card">
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
      className={`flex-1 p-6 ${active ? 'hover:bg-muted/50 transition-colors cursor-pointer' : 'opacity-60'} flex flex-col items-center justify-center text-center group`}
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
