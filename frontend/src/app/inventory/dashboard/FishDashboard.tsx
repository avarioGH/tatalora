"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownToLine, ArrowUpFromLine, Package, LayoutDashboard, Search, FileText , AlertTriangle} from "lucide-react"

export default function FishDashboard() {
  const [kpi, setKpi] = useState<any>({})
  const [warehouseSummary, setWarehouseSummary] = useState<any[]>([])
  const [recentMovements, setRecentMovements] = useState<any[]>([])

  useEffect(() => {
    // We will just fetch standard stocks and movements to derive the dashboard
    api.get('/inventory/stocks').then((res: any) => {
      const stocks = Array.isArray(res.data) ? res.data : []
      const totalStock = stocks.reduce((sum: number, s: any) => sum + (s.current_stock || 0), 0)
      
      const whMap = new Map()
      stocks.forEach((s: any) => {
        const wName = s.warehouse?.name || 'Unknown'
        whMap.set(wName, (whMap.get(wName) || 0) + (s.current_stock || 0))
      })
      
      setWarehouseSummary(Array.from(whMap.entries()).map(([name, stock]) => ({ name, stock })))
      setKpi((prev: any) => ({ ...prev, totalStock }))
    }).catch(console.error)

    api.get('/inventory/movements').then((res: any) => {
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setRecentMovements(items.slice(0, 10))

      const today = new Date().toDateString()
      let todayIn = 0
      let todayOut = 0

      items.forEach((m: any) => {
        const mDate = new Date(m.created_at || m.date).toDateString()
        if (mDate === today) {
          todayIn += m.qty_in || 0
          todayOut += m.qty_out || 0
        }
      })
      
      setKpi((prev: any) => ({ ...prev, todayIn, todayOut }))
    }).catch(console.error)
  }, [])

  return (
    <div className="space-y-6 pb-10 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 md:w-8 md:h-8 text-primary" /> Dashboard Ikan
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">Ringkasan stok dan pergerakan ikan hari ini.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex justify-between">
              Total Stok Ikan
              <Package className="w-4 h-4 text-primary opacity-70" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
            <div className="text-xl md:text-3xl font-bold text-foreground">
              {Number(kpi.totalStock || 0).toLocaleString()} <span className="text-xs md:text-sm font-medium text-muted-foreground">Item</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex justify-between">
              Ikan Masuk Hari Ini
              <ArrowDownToLine className="w-4 h-4 text-emerald-600 opacity-70" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
            <div className="text-xl md:text-3xl font-bold text-emerald-600">
              {Number(kpi.todayIn || 0).toLocaleString()} <span className="text-xs md:text-sm font-medium text-muted-foreground">Masuk</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex justify-between">
              Ikan Keluar Hari Ini
              <ArrowUpFromLine className="w-4 h-4 text-rose-600 opacity-70" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
            <div className="text-xl md:text-3xl font-bold text-rose-600">
              {Number(kpi.todayOut || 0).toLocaleString()} <span className="text-xs md:text-sm font-medium text-muted-foreground">Keluar</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm cursor-pointer hover:border-primary transition-colors" onClick={() => window.location.href = '/inventory/disposals'}>
          <CardHeader className="pb-2 pt-4 px-4 md:px-5">
            <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground uppercase flex justify-between">
              Deadstock / Pemusnahan
              <AlertTriangle className="w-4 h-4 text-orange-500 opacity-70" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
            <div className="text-xl md:text-3xl font-bold text-orange-500">
              {Number(kpi.deadstock || 0).toLocaleString()} <span className="text-xs md:text-sm font-medium text-muted-foreground">Item</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 shadow-sm flex flex-col">
          <CardHeader className="px-5 pt-5 pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold">Stok per Gudang</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-border/50">
              {warehouseSummary.map((w: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30">
                  <span className="text-sm font-medium">{w.name}</span>
                  <span className="text-sm font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
                    {Number(w.stock || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 shadow-sm flex flex-col">
          <CardHeader className="px-5 pt-5 pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold">Riwayat Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Waktu</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Produk</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tipe</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Masuk</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentMovements.map((m: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="py-3 px-4">{new Date(m.created_at).toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 font-medium">{m.product?.name}</td>
                    <td className="py-3 px-4"><span className="text-[11px] font-bold bg-muted px-2 py-1 rounded">{m.transaction_type}</span></td>
                    <td className="text-right py-3 px-4 font-bold text-emerald-600">{m.qty_in > 0 ? "+" + m.qty_in : "-"}</td>
                    <td className="text-right py-3 px-4 font-bold text-rose-600">{m.qty_out > 0 ? "-" + m.qty_out : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
