"use client"

import React, { useState } from "react"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, Wallet, Clock, AlertCircle, ChevronRight, 
  Download, FileText, ShoppingCart, Truck, Receipt, Calendar, Users
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts"

// --- Mock Data ---
const trendData = [
  { name: 'Mei', tagihan: 4000, pemesanan: 2400 },
  { name: 'Jun', tagihan: 3000, pemesanan: 1398 },
  { name: 'Jul', tagihan: 2000, pemesanan: 9800 },
  { name: 'Agt', tagihan: 2780, pemesanan: 3908 },
  { name: 'Sep', tagihan: 1890, pemesanan: 4800 },
  { name: 'Okt', tagihan: 2390, pemesanan: 3800 },
]

const rasioLunasData = [
  { name: 'Lunas', value: 75, color: '#10b981' },
  { name: 'Belum Lunas', value: 25, color: '#e2e8f0' }
]

const salesPersonData = [
  { name: 'Budi S.', value: 45 },
  { name: 'Ani M.', value: 30 },
  { name: 'Tono H.', value: 20 },
  { name: 'Siti R.', value: 15 },
]

export default function SalesOverviewPage() {
  const [timeFilter, setTimeFilter] = useState("Bulan")

  return (
    <div className="p-6 md:p-8 space-y-8 bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            TATALORA <span className="font-light text-muted-foreground mx-2">|</span> Overview Penjualan
          </h1>
          <p className="text-muted-foreground mt-1">Pantau performa penjualan, tagihan, dan pembayaran bisnis Anda.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-card rounded-lg p-1 border shadow-sm">
            {['Hari', 'Bulan', 'Tahun'].map(filter => (
              <button 
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeFilter === filter 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <Button variant="outline" className="gap-2 bg-card">
            <Download className="h-4 w-4" />
            Unduh Laporan
          </Button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <SummaryCard 
          title="Total Penjualan" 
          value="Rp 124.500.000" 
          trend="+12.5%" 
          trendUp={true}
          subtitle="Bulan ini" 
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />} 
          colorClass="bg-blue-500/10 border-blue-500/20"
        />
        <SummaryCard 
          title="Pembayaran Diterima" 
          value="Rp 89.200.000" 
          trend="+8.2%" 
          trendUp={true}
          subtitle="Bulan ini" 
          icon={<Wallet className="h-5 w-5 text-emerald-600" />} 
          colorClass="bg-emerald-500/10 border-emerald-500/20"
        />
        <SummaryCard 
          title="Menunggu Pembayaran" 
          value="Rp 35.300.000" 
          trend="-2.4%" 
          trendUp={false}
          subtitle="Dibanding bulan lalu" 
          icon={<Clock className="h-5 w-5 text-amber-600" />} 
          colorClass="bg-amber-500/10 border-amber-500/20"
        />
        <SummaryCard 
          title="Jatuh Tempo" 
          value="Rp 12.100.000" 
          trend="+4.1%" 
          trendUp={true} // Usually bad for overdue, but we use red
          trendColor="text-rose-500"
          subtitle="Dari total tagihan" 
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />} 
          colorClass="bg-rose-500/10 border-rose-500/20"
        />
      </div>

      {/* Alur Penjualan (Pipeline) - TATALORA Signature Style */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-card text-card-foreground dark:bg-muted px-6 py-4 border-b border-border">
          <h3 className="text-white font-medium flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" /> 
            Alur Penjualan Belum Selesai
          </h3>
        </div>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row w-full divide-y md:divide-y-0 md:divide-x divide-border">
            
            <PipelineStep 
              title="Penawaran" 
              count="12" 
              label="Penawaran disetujui" 
              icon={<FileText className="h-6 w-6 text-indigo-500" />} 
              bgColor="bg-indigo-500/10" 
              active={true}
            />
            
            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </div>

            <PipelineStep 
              title="Pemesanan" 
              count="8" 
              label="Pesanan belum diproses" 
              icon={<ShoppingCart className="h-6 w-6 text-sky-500" />} 
              bgColor="bg-sky-500/10" 
              active={true}
            />
            
            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </div>

            <PipelineStep 
              title="Pengiriman" 
              count="5" 
              label="Pengiriman belum ditagih" 
              icon={<Truck className="h-6 w-6 text-amber-500" />} 
              bgColor="bg-amber-500/10" 
              active={true}
            />
            
            <div className="hidden md:flex items-center justify-center w-8 bg-muted -mx-4 z-10">
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </div>

            <PipelineStep 
              title="Tagihan" 
              count="3" 
              label="Tagihan jatuh tempo" 
              icon={<Receipt className="h-6 w-6 text-rose-500" />} 
              bgColor="bg-rose-500/10" 
              active={true}
            />
            
          </div>
        </CardContent>
      </Card>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-0 ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Tren Tagihan & Pemesanan</CardTitle>
            <CardDescription>Performa bulanan sepanjang tahun</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <CardTitle className="text-lg">Rasio Lunas</CardTitle>
            <CardDescription>Bulan ini</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-80 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
              <span className="text-4xl font-bold text-foreground">75%</span>
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
                <div className="w-3 h-3 rounded-full bg-emerald-500/100"></div>
                <span className="text-xs text-muted-foreground">Lunas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                <span className="text-xs text-muted-foreground">Belum</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-0 ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Penjualan per Sales Person</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesPersonData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 13, fontWeight: 500}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} name="Jumlah Penjualan">
                  {salesPersonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-0 ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Penjualan per Pelanggan</CardTitle>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <div className="text-center p-8 bg-muted rounded-xl border border-dashed border-border w-full h-full flex flex-col items-center justify-center">
              <Users className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-muted-foreground font-medium">Belum ada data pelanggan bulan ini</p>
              <p className="text-xs text-muted-foreground mt-1">Data akan muncul setelah ada transaksi berhasil.</p>
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

