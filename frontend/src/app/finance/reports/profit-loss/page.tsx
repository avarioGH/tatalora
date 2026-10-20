"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceAPI } from "@/lib/api"
import { ArrowLeft, Loader2, Download } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ProfitLossPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await FinanceAPI.getProfitLossReport()
      setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val)
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Link href="/finance/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Laporan Laba Rugi</h1>
          <p className="text-muted-foreground text-sm">Profit & Loss Statement (Accrual-Based)</p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Laba Rugi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            
            {/* Pendapatan */}
            <div>
              <h3 className="font-semibold text-lg text-primary dark:text-primary border-b pb-2 mb-3">Pendapatan Operasional</h3>
              <div className="space-y-2 pl-2">
                {data?.revenue?.map((item: any, idx: number) => (
                  <div key={"rev-" + idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{formatIDR(item.amount)}</span>
                  </div>
                ))}
                {data?.contraRevenue?.map((item: any, idx: number) => (
                  <div key={"cr-" + idx} className="flex justify-between text-sm text-red-500">
                    <span>{item.name} (Kontra)</span>
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
                  <div key={"cogs-" + idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
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
                  <div key={"oe-" + idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{formatIDR(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold mt-4 pt-2 border-t text-red-700 dark:text-red-500">
                <span>Total Beban Operasional</span>
                <span>{formatIDR(data?.totalOperatingExpenses || 0)}</span>
              </div>
            </div>

            {/* Pendapatan/Beban Lainnya */}
            <div>
              <h3 className="font-semibold text-lg border-b pb-2 mb-3">Pendapatan & Beban Lainnya</h3>
              <div className="space-y-2 pl-2">
                {data?.otherIncome?.map((item: any, idx: number) => (
                  <div key={"oi-" + idx} className="flex justify-between text-sm text-emerald-600">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatIDR(item.amount)}</span>
                  </div>
                ))}
                {data?.otherExpenses?.map((item: any, idx: number) => (
                  <div key={"oe2-" + idx} className="flex justify-between text-sm text-red-600">
                    <span>{item.name}</span>
                    <span className="font-medium">-{formatIDR(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Net Profit */}
            <div className={`p-4 rounded-xl flex justify-between items-center text-xl font-bold ${(data?.netProfit || 0) >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              <span>Laba / Rugi Bersih (Net Profit)</span>
              <span>{formatIDR(data?.netProfit || 0)}</span>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}
