"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FinanceAPI } from "@/lib/api"
import { ArrowLeft, Loader2, Download, Calendar, ExternalLink, Filter } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ProfitLossPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA")
  )
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("en-CA")
  )
  const [quickPeriod, setQuickPeriod] = useState("this_month")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (s: string = startDate, e: string = endDate) => {
    try {
      setLoading(true)
      const res = await FinanceAPI.getProfitLossReport({ start_date: s, end_date: e })
      setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = (val: string) => {
    setQuickPeriod(val)
    const now = new Date()
    let s = startDate
    let e = endDate
    if (val === "this_month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-CA"); setStartDate(s)
      e = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-CA"); setEndDate(e)
    } else if (val === "last_month") {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("en-CA"); setStartDate(s)
      e = new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString("en-CA"); setEndDate(e)
    } else if (val === "this_year") {
      s = new Date(now.getFullYear(), 0, 1).toLocaleDateString("en-CA"); setStartDate(s)
      e = new Date(now.getFullYear(), 11, 31).toLocaleDateString("en-CA"); setEndDate(e)
    }
    fetchData(s, e)
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val || 0)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/finance/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Laporan Laba Rugi</h1>
            <p className="text-muted-foreground text-sm">Profit & Loss Statement (Standar SAK EMKM)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Export PDF/Print
          </Button>
        </div>
      </div>

      {/* Date & Period Controls */}
      <Card className="border shadow-xs bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Rentang Tanggal:</span>
            </div>
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
            <Button size="sm" onClick={() => fetchData()} className="h-9 px-3 text-xs bg-primary text-primary-foreground">
              Terapkan Filter
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-muted-foreground">Pilihan Cepat:</span>
            <select 
              value={quickPeriod} 
              onChange={e => handlePeriodChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
            >
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="this_year">Tahun Ini (YTD)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Ringkasan Laba Rugi</CardTitle>
                <CardDescription>
                  Periode {new Date(startDate).toLocaleDateString('id-ID')} - {new Date(endDate).toLocaleDateString('id-ID')}
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Klik nama akun untuk drilldown ke Buku Besar
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              
              {/* Pendapatan */}
              <div>
                <h3 className="font-semibold text-lg text-primary dark:text-primary border-b pb-2 mb-3">Pendapatan Operasional</h3>
                <div className="space-y-2 pl-2">
                  {data?.revenue?.map((item: any, idx: number) => (
                    <div key={"rev-" + idx} className="flex justify-between text-sm py-1 hover:bg-muted/30 px-2 rounded">
                      <Link href={`/finance/gl?account=${encodeURIComponent(item.name)}`} className="text-foreground hover:text-primary hover:underline flex items-center gap-1">
                        {item.name}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <span className="font-medium">{formatIDR(item.amount)}</span>
                    </div>
                  ))}
                  {data?.contraRevenue?.map((item: any, idx: number) => (
                    <div key={"cr-" + idx} className="flex justify-between text-sm text-red-500 py-1 hover:bg-muted/30 px-2 rounded">
                      <Link href={`/finance/gl?account=${encodeURIComponent(item.name)}`} className="hover:underline flex items-center gap-1">
                        {item.name} (Kontra)
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <span>-{formatIDR(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold mt-4 pt-2 border-t text-primary">
                  <span>Total Pendapatan Bersih (Net Revenue)</span>
                  <span>{formatIDR(data?.netRevenue || 0)}</span>
                </div>
              </div>

              {/* COGS */}
              <div>
                <h3 className="font-semibold text-lg text-orange-600 dark:text-orange-400 border-b pb-2 mb-3">Harga Pokok Penjualan (HPP / COGS)</h3>
                <div className="space-y-2 pl-2">
                  {data?.cogs?.map((item: any, idx: number) => (
                    <div key={"cogs-" + idx} className="flex justify-between text-sm py-1 hover:bg-muted/30 px-2 rounded">
                      <Link href={`/finance/gl?account=${encodeURIComponent(item.name)}`} className="text-foreground hover:text-orange-600 hover:underline flex items-center gap-1">
                        {item.name}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <span className="font-medium">{formatIDR(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold mt-4 pt-2 border-t text-orange-700 dark:text-orange-500">
                  <span>Total HPP</span>
                  <span>{formatIDR(data?.totalCogs || 0)}</span>
                </div>
              </div>
              
              {/* Gross Profit */}
              <div className="p-3 bg-primary/5 rounded-lg flex justify-between items-center text-lg font-bold text-primary">
                <span>Laba Kotor (Gross Profit)</span>
                <span>{formatIDR(data?.grossProfit || 0)}</span>
              </div>

              {/* Beban Operasional */}
              <div>
                <h3 className="font-semibold text-lg text-red-600 dark:text-red-400 border-b pb-2 mb-3">Beban Operasional</h3>
                <div className="space-y-2 pl-2">
                  {data?.operatingExpenses?.map((item: any, idx: number) => (
                    <div key={"oe-" + idx} className="flex justify-between text-sm py-1 hover:bg-muted/30 px-2 rounded">
                      <Link href={`/finance/gl?account=${encodeURIComponent(item.name)}`} className="text-foreground hover:text-red-600 hover:underline flex items-center gap-1">
                        {item.name}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                      <span className="font-medium">{formatIDR(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold mt-4 pt-2 border-t text-red-700 dark:text-red-500">
                  <span>Total Beban Operasional</span>
                  <span>{formatIDR(data?.totalOperatingExpenses || 0)}</span>
                </div>
              </div>

              {/* Laba Bersih */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex justify-between items-center text-xl font-bold text-emerald-600 dark:text-emerald-400">
                <span>Laba Bersih Tahun Berjalan (Net Income)</span>
                <span>{formatIDR(data?.netProfit || 0)}</span>
              </div>

            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
