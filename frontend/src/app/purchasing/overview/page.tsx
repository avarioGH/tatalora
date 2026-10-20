"use client"

import React, { useState } from "react"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, TrendingDown, HelpCircle, Printer, Download,
  ShoppingCart, FileText, Truck, Receipt, ArrowRight, DollarSign, Wallet
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"

const lineData = [
  { name: 'Mei', tagihan: 0, pesanan: 0 },
  { name: 'Jun', tagihan: 0, pesanan: 0 },
  { name: 'Jul', tagihan: 0, pesanan: 0 },
  { name: 'Agt', tagihan: 0, pesanan: 0 },
  { name: 'Sep', tagihan: 0, pesanan: 0 },
  { name: 'Okt', tagihan: 1800000, pesanan: 2000000 },
]

const pieData = [
  { name: 'Pristine', value: 1800000 },
  { name: 'Lainnya', value: 0 },
]

const COLORS = ['#F43F5E', '#3B82F6', '#10B981', '#F59E0B']

export default function PurchasingOverviewPage() {
  const [period, setPeriod] = useState("Bulan")

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Overview Pembelian
          </h1>
          <p className="text-muted-foreground mt-1">Pantau performa dan alur pembelian bisnismu.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-card text-foreground border-border gap-2">
            <HelpCircle className="w-4 h-4" /> Panduan
          </Button>
          <Button variant="outline" className="bg-card text-foreground border-border gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <div className="bg-muted p-1 rounded-md flex items-center ml-2 border border-border">
            <button onClick={() => setPeriod("Bulan")} className={`px-3 py-1 text-sm rounded-sm transition-all ${period === 'Bulan' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground'}`}>Bulan</button>
            <button onClick={() => setPeriod("Tahun")} className={`px-3 py-1 text-sm rounded-sm transition-all ${period === 'Tahun' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground'}`}>Tahun</button>
          </div>
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* KPI 1 */}
        <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pembelian</p>
                <h3 className="text-2xl font-bold text-foreground">1.800.000</h3>
                <p className="text-xs text-muted-foreground mt-1">1 Tagihan Pembelian Bulan Ini</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-emerald-500 font-medium text-sm flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> 100%</span>
              <span className="text-xs text-muted-foreground">vs tanggal sama bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pembayaran Dikirim</p>
                <h3 className="text-2xl font-bold text-foreground">1.800.000</h3>
                <p className="text-xs text-muted-foreground mt-1">1 Tagihan Pembelian Bulan Ini</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Wallet className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-emerald-500 font-medium text-sm flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> 100%</span>
              <span className="text-xs text-muted-foreground">vs tanggal sama bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menunggu Pembayaran</p>
                <h3 className="text-2xl font-bold text-foreground">0</h3>
                <p className="text-xs text-muted-foreground mt-1">0 Tagihan Pembelian</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground font-medium text-sm flex items-center">0%</span>
              <span className="text-xs text-muted-foreground">vs tanggal sama bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">Jatuh Tempo</p>
                <h3 className="text-2xl font-bold text-rose-500">0</h3>
                <p className="text-xs text-muted-foreground mt-1">0 Tagihan Pembelian</p>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl">
                <TrendingDown className="w-6 h-6 text-rose-500" />
              </div>
            </div>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground ml-auto">dari total Tagihan belum dibayar</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Line Chart */}
        <Card className="border-0 shadow-sm ring-1 ring-border bg-card xl:col-span-2">
          <CardHeader className="border-b border-border bg-muted/30 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tagihan & Pesanan Pembelian</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} tickFormatter={(val) => val === 0 ? '0' : (val/1000000).toFixed(1) + 'M'} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="tagihan" name="Tagihan Pembelian" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, fill: '#3B82F6', strokeWidth: 0}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="pesanan" name="Pesanan Pembelian" stroke="#10B981" strokeWidth={3} dot={{r: 4, fill: '#10B981', strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border-0 shadow-sm ring-1 ring-border bg-card xl:col-span-1">
          <CardHeader className="border-b border-border bg-muted/30 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Pembelian Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[400px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Bottom Pipeline */}
      <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
        <CardHeader className="border-b border-border bg-muted/30 pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Alur Pembelian Belum Selesai</CardTitle>
        </CardHeader>
        <CardContent className="p-6 overflow-x-auto">
          <div className="flex items-center min-w-[800px] gap-4">
            
            {/* Step 1 */}
            <div className="flex-1">
              <div className="h-24 bg-amber-500 rounded-lg flex flex-col items-center justify-center text-white relative shadow-md">
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">Penawaran Pembelian</span>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-amber-500 rotate-45 transform"></div>
              </div>
              <div className="mt-4 px-2">
                <p className="font-bold text-foreground text-lg">2.000.000</p>
                <p className="text-xs text-muted-foreground">1 Penawaran Pembelian disetujui</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex-1">
              <div className="h-24 bg-rose-500 rounded-lg flex flex-col items-center justify-center text-white relative shadow-md">
                <ShoppingCart className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">Pesanan Pembelian</span>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-card rotate-45 transform"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-rose-500 rotate-45 transform"></div>
              </div>
              <div className="mt-4 px-2">
                <p className="font-bold text-foreground text-lg">0</p>
                <p className="text-xs text-muted-foreground">0 Pesanan Pembelian belum selesai</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex-1">
              <div className="h-24 bg-teal-500 rounded-lg flex flex-col items-center justify-center text-white relative shadow-md">
                <Truck className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">Pengiriman Pembelian</span>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-card rotate-45 transform"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-teal-500 rotate-45 transform"></div>
              </div>
              <div className="mt-4 px-2">
                <p className="font-bold text-foreground text-lg">0</p>
                <p className="text-xs text-muted-foreground">0 Pengiriman Pembelian belum ditagih</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex-1">
              <div className="h-24 bg-blue-500 rounded-lg flex flex-col items-center justify-center text-white relative shadow-md">
                <Receipt className="w-8 h-8 mb-2" />
                <span className="font-semibold text-sm">Tagihan Pembelian</span>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-card rotate-45 transform"></div>
              </div>
              <div className="mt-4 px-2">
                <p className="font-bold text-foreground text-lg">0</p>
                <p className="text-xs text-muted-foreground">0 Tagihan Pembelian jatuh tempo</p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

    </div>
  )
}
