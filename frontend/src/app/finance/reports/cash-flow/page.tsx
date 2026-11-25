"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FinanceAPI } from "@/lib/api"
import { ArrowLeft, Loader2, Download, Calendar, Layers, Activity, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CashFlowPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reportView, setReportView] = useState<"classified" | "mutasi">("classified")
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA")
  )
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("en-CA")
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await FinanceAPI.getCashFlowReport()
      setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val || 0)
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalInflow = data?.totalInflow || 0
  const totalOutflow = data?.totalOutflow || 0
  const netCashFlow = data?.netCashFlow || (totalInflow - totalOutflow)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/finance/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Laporan Arus Kas (Cash Flow Statement)</h1>
            <p className="text-muted-foreground text-sm">Standar Akuntansi Keuangan (PSAK 2 / SAK EMKM)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Export / Cetak
          </Button>
        </div>
      </div>

      {/* Filter and View Toggle */}
      <Card className="border shadow-xs bg-card">
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant={reportView === "classified" ? "default" : "outline"}
              onClick={() => setReportView("classified")}
              className="gap-1.5 text-xs"
            >
              <Layers className="w-3.5 h-3.5" /> Arus Kas Terklasifikasi (3 Aktivitas)
            </Button>
            <Button 
              size="sm" 
              variant={reportView === "mutasi" ? "default" : "outline"}
              onClick={() => setReportView("mutasi")}
              className="gap-1.5 text-xs"
            >
              <Activity className="w-3.5 h-3.5" /> Ringkasan Mutasi Masuk/Keluar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="w-36 h-9 text-xs"
            />
            <span className="text-xs text-muted-foreground">s/d</span>
            <Input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="w-36 h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : reportView === "classified" ? (
        /* CLASSIFIED CASH FLOW (3 ACTIVITIES) */
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg">Arus Kas Berdasarkan Aktivitas</CardTitle>
            <CardDescription>
              Periode {new Date(startDate).toLocaleDateString('id-ID')} - {new Date(endDate).toLocaleDateString('id-ID')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            
            {/* 1. Aktivitas Operasi */}
            <div>
              <h3 className="font-semibold text-base text-primary border-b pb-2 mb-3 flex items-center justify-between">
                <span>1. Arus Kas dari Aktivitas Operasi</span>
                <span className="text-sm font-bold">{formatIDR(netCashFlow)}</span>
              </h3>
              <div className="space-y-2 pl-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Penerimaan kas dari pelanggan (Penjualan Tunai & Pelunasan Piutang)</span>
                  <span className="font-medium text-emerald-600">{formatIDR(totalInflow)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Pembayaran kas kepada pemasok & beban operasional</span>
                  <span className="font-medium text-rose-600">-{formatIDR(totalOutflow)}</span>
                </div>
              </div>
            </div>

            {/* 2. Aktivitas Investasi */}
            <div>
              <h3 className="font-semibold text-base text-blue-600 border-b pb-2 mb-3 flex items-center justify-between">
                <span>2. Arus Kas dari Aktivitas Investasi</span>
                <span className="text-sm font-bold">Rp 0</span>
              </h3>
              <div className="space-y-2 pl-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Perolehan aset tetap / peralatan</span>
                  <span className="font-medium">Rp 0</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Hasil penjualan aset tetap</span>
                  <span className="font-medium">Rp 0</span>
                </div>
              </div>
            </div>

            {/* 3. Aktivitas Pendanaan */}
            <div>
              <h3 className="font-semibold text-base text-purple-600 border-b pb-2 mb-3 flex items-center justify-between">
                <span>3. Arus Kas dari Aktivitas Pendanaan</span>
                <span className="text-sm font-bold">Rp 0</span>
              </h3>
              <div className="space-y-2 pl-3 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Setoran modal pemilik / dividen</span>
                  <span className="font-medium">Rp 0</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Penerimaan / pelunasan pinjaman bank</span>
                  <span className="font-medium">Rp 0</span>
                </div>
              </div>
            </div>

            {/* Kenaikan / Penurunan Bersih */}
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center text-lg font-bold text-foreground">
              <span>Kenaikan (Penurunan) Bersih Kas & Setara Kas</span>
              <span className={netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {formatIDR(netCashFlow)}
              </span>
            </div>

          </CardContent>
        </Card>
      ) : (
        /* MUTASI MASUK & KELUAR */
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg">Daftar Mutasi Kas Masuk & Keluar</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-8">
              {/* Cash Inflow */}
              <div>
                <h3 className="font-semibold text-base text-emerald-600 border-b pb-2 mb-3">Kas Masuk (Inflows)</h3>
                <div className="space-y-3">
                  {data?.cashInflows?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm items-center border-b border-border/60 pb-2">
                      <div>
                        <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                        <div className="text-foreground font-medium">{item.description}</div>
                      </div>
                      <span className="font-semibold text-emerald-600">{formatIDR(item.amount)}</span>
                    </div>
                  ))}
                  {(!data?.cashInflows || data?.cashInflows?.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">Belum ada transaksi kas masuk.</p>
                  )}
                </div>
                <div className="flex justify-between font-bold mt-4 text-emerald-600">
                  <span>Total Kas Masuk</span>
                  <span>{formatIDR(totalInflow)}</span>
                </div>
              </div>

              {/* Cash Outflow */}
              <div>
                <h3 className="font-semibold text-base text-rose-600 border-b pb-2 mb-3">Kas Keluar (Outflows)</h3>
                <div className="space-y-3">
                  {data?.cashOutflows?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm items-center border-b border-border/60 pb-2">
                      <div>
                        <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                        <div className="text-foreground font-medium">{item.description}</div>
                      </div>
                      <span className="font-semibold text-rose-600">{formatIDR(item.amount)}</span>
                    </div>
                  ))}
                  {(!data?.cashOutflows || data?.cashOutflows?.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">Belum ada transaksi kas keluar.</p>
                  )}
                </div>
                <div className="flex justify-between font-bold mt-4 text-rose-600">
                  <span>Total Kas Keluar</span>
                  <span>{formatIDR(totalOutflow)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
