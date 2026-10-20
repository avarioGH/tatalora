"use client"

import React, { useState } from "react"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, FileText, CheckCircle, Clock, AlertCircle, ChevronRight, 
  Download, Box, Receipt, Truck, Users, Calendar
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts"

// --- Mock Data ---
const trendData = [
  { name: 'Mei', tagihan: 1500, pesanan: 1200 },
  { name: 'Jun', tagihan: 2800, pesanan: 2500 },
  { name: 'Jul', tagihan: 1200, pesanan: 1000 },
  { name: 'Agt', tagihan: 3500, pesanan: 3800 },
  { name: 'Sep', tagihan: 2100, pesanan: 2400 },
  { name: 'Okt', tagihan: 4200, pesanan: 4500 },
]

const rasioLunasData = [
  { name: 'Lunas', value: 85, color: '#10b981' },
  { name: 'Belum Lunas', value: 15, color: 'var(--muted)' }
]

const vendorData = [
  { name: 'PT Surya Kayu', value: 45000000 },
  { name: 'CV Logam Abadi', value: 32000000 },
  { name: 'Toko Elektronik Jaya', value: 18500000 },
  { name: 'Makmur Supplier', value: 12000000 },
]

export default function PurchasingOverviewPage() {
  const [filter, setFilter] = useState("Bulan")

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShoppingCart className="h-7 w-7 text-teal-600" />
            TATALORA <span className="text-muted-foreground font-normal">| Overview Pembelian</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Pantau pengeluaran modal, tagihan supplier, dan performa vendor.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card border border-border rounded-lg p-1">
            {['Hari', 'Bulan', 'Tahun'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === f ? 'bg-teal-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="outline" className="gap-2 bg-card border-border shadow-sm">
            <Download className="w-4 h-4" /> Unduh Laporan
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Pembelian" 
          value="Rp 85.000.000" 
          trend="+15.2%" 
          trendUp={true}
          subtitle="Bulan ini" 
          icon={<ShoppingCart className="w-5 h-5 text-teal-600" />} 
          colorClass="bg-teal-500/10"
        />
        <SummaryCard 
          title="Pembayaran Dikirim" 
          value="Rp 72.500.000" 
          trend="+8.4%" 
          trendUp={true}
          subtitle="Bulan ini" 
          icon={<CheckCircle className="w-5 h-5 text-indigo-600" />} 
          colorClass="bg-indigo-500/10"
        />
        <SummaryCard 
          title="Menunggu Pembayaran" 
          value="Rp 12.500.000" 
          trend="-2.1%" 
          trendUp={false}
          subtitle="Dibanding bulan lalu" 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          colorClass="bg-amber-500/10"
          trendColor="text-emerald-500" // Because less waiting payment is good
        />
        <SummaryCard 
          title="Jatuh Tempo" 
          value="Rp 3.200.000" 
          trend="+1.2%" 
          trendUp={true} // But it's bad, so we override color below
          subtitle="Dari total tagihan" 
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />} 
          colorClass="bg-rose-500/10"
          trendColor="text-rose-500"
        />
      </div>

      {/* Pipeline Row (Alur Pembelian) */}
      <Card className="border-0 shadow-sm ring-1 ring-border bg-card overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Box className="w-4 h-4 text-teal-500" /> Alur Pembelian Belum Selesai
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-stretch divide-y md:divide-y-0 md:divide-x divide-border">
            
            <PipelineStep 
              title="Penawaran" 
              count="5" 
              label="Menunggu setuju" 
              icon={<FileText className="w-6 h-6 text-amber-500" />}
              bgColor="bg-amber-500/10 dark:bg-amber-500/20"
              active={true}
            />
            <div className="hidden md:flex items-center justify-center bg-muted w-8 z-10 -mx-4 rounded-full border border-card shadow-sm">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            
            <PipelineStep 
              title="Pesanan" 
              count="12" 
              label="Belum dikirim supplier" 
              icon={<ShoppingCart className="w-6 h-6 text-rose-500" />}
              bgColor="bg-rose-500/10 dark:bg-rose-500/20"
              active={true}
            />
            <div className="hidden md:flex items-center justify-center bg-muted w-8 z-10 -mx-4 rounded-full border border-card shadow-sm">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <PipelineStep 
              title="Penerimaan" 
              count="3" 
              label="Barang di jalan" 
              icon={<Truck className="w-6 h-6 text-teal-500" />}
              bgColor="bg-teal-500/10 dark:bg-teal-500/20"
              active={true}
            />
            <div className="hidden md:flex items-center justify-center bg-muted w-8 z-10 -mx-4 rounded-full border border-card shadow-sm">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <PipelineStep 
              title="Tagihan" 
              count="8" 
              label="Menunggu pelunasan" 
              icon={<Receipt className="w-6 h-6 text-indigo-500" />}
              bgColor="bg-indigo-500/10 dark:bg-indigo-500/20"
              active={true}
            />

          </div>
        </CardContent>
      </Card>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-0 ring-1 ring-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Tren Tagihan & Pesanan Pembelian</CardTitle>
            <CardDescription>Performa pengeluaran bulanan sepanjang tahun</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTagihan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPesanan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)', fontSize: 12}} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="tagihan" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorTagihan)" name="Tagihan" />
                <Area type="monotone" dataKey="pesanan" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorPesanan)" name="Pesanan" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 ring-1 ring-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Rasio Lunas Pembelian</CardTitle>
            <CardDescription>Bulan ini</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-80 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
              <span className="text-4xl font-bold text-foreground">85%</span>
              <span className="text-sm text-muted-foreground">Lunas</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rasioLunasData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {rasioLunasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-foreground">Lunas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
                <span className="text-xs text-foreground">Belum</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-0 ring-1 ring-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Pembelian per Vendor Top</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'var(--foreground)', fontSize: 13, fontWeight: 500}} width={120} />
                <RechartsTooltip cursor={{fill: 'var(--muted)'}} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={24} name="Jumlah Beli">
                  {vendorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-0 ring-1 ring-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Total Pembelian per Kategori</CardTitle>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <div className="text-center p-8 bg-muted/50 rounded-xl border border-dashed border-border w-full h-full flex flex-col items-center justify-center">
              <Box className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">Belum ada data kategori bulan ini</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Data akan muncul setelah Anda mengelompokkan produk.</p>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

function SummaryCard({ title, value, trend, trendUp, subtitle, icon, colorClass, trendColor }: any) {
  const isPositive = trendUp;
  const tColor = trendColor || (isPositive ? 'text-emerald-500' : 'text-rose-500');
  
  return (
    <Card className="border-0 shadow-sm ring-1 ring-border hover:shadow-md transition-all duration-200 overflow-hidden group relative bg-card">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-background/0 to-muted/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2.5 rounded-xl ${colorClass}`}>
            {icon}
          </div>
          <Badge variant="outline" className={`bg-background/50 border-border ${tColor} font-semibold`}>
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
    <div className={`flex-1 p-6 ${active ? 'hover:bg-muted/50 transition-colors cursor-pointer' : 'opacity-60'} flex flex-col items-center justify-center text-center group`}>
      <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-border/50`}>
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
