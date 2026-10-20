"use client"
import { useState, useEffect } from "react"
import { TimberAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Package2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TimberStockPage() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    TimberAPI.getTimberStock().then((res: any) => setData(res.items || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = (Array.isArray(data) ? data : []).filter(item => 
    item.timberVariant?.sku?.toLowerCase().includes(search.toLowerCase()) ||
    item.timberVariant?.species?.toLowerCase().includes(search.toLowerCase()) ||
    item.location?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package2 className="w-6 h-6 text-primary" /> Finished Timber Stock
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Real-time balances of sawn timber inventory across all warehouses and locations.
          </p>
        </div>
      </div>

      <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package2 className="w-4 h-4 text-primary" /> Stock Balances
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-70" />
              <Input type="search" placeholder="Search SKU or Location..." className="pl-9 bg-background h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center">
              <Package2 className="w-10 h-10 text-muted-foreground mb-4 opacity-40" />
              <h3 className="text-base font-semibold text-foreground mb-1">No stock records found</h3>
              <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">Belum ada data stock kayu yang sesuai dengan pencarian Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full sm:max-w-none">
              <table className="min-w-[900px] md:min-w-full w-full text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Product / Variant</th>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Location</th>
                    <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Dimensions (mm)</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Stock IN</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Stock OUT</th>
                    <th className="p-4 px-6 text-right font-semibold text-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 h-11">Current PCS</th>
                    <th className="p-4 px-6 text-right font-semibold text-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 h-11">Current M³</th>
                    <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(stock => (
                    <tr key={stock.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-6">
                        <div className="font-semibold text-foreground/90">{stock.timberVariant?.sku || "-"}</div>
                        <div className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{stock.timberVariant?.species || "-"}</span>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span className="font-medium text-primary">Grade {stock.timberVariant?.grade || "-"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 font-medium text-muted-foreground">{stock.location?.name || "-"}</td>
                      <td className="py-3 px-6 text-center font-medium text-muted-foreground text-[13px]">
                        {stock.timberVariant?.thickness || 0} &times; {stock.timberVariant?.width || 0} &times; {stock.timberVariant?.length || 0}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-emerald-600 dark:text-emerald-500">
                        {stock.stockInPcs > 0 ? `+${stock.stockInPcs}` : stock.stockInPcs}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-rose-600 dark:text-rose-500">
                        {stock.stockOutPcs > 0 ? `-${stock.stockOutPcs}` : stock.stockOutPcs}
                      </td>
                      <td className="py-3 px-6 text-right font-bold bg-indigo-50/30 dark:bg-indigo-950/30 text-indigo-900 dark:text-primary text-[15px]">
                        {stock.currentPcs}
                      </td>
                      <td className="py-3 px-6 text-right font-bold bg-indigo-50/30 dark:bg-indigo-950/30 text-primary dark:text-primary text-[15px]">
                        {(stock.currentVolumeM3 || 0).toFixed(4)}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => router.push(`/inventory/timber-stock/${stock.timberVariantId}/${stock.locationId}/card`)}
                          className="h-8 px-2 text-[12px] font-semibold text-primary hover:text-primary hover:bg-primary/10"
                        >
                          Stock Card <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
