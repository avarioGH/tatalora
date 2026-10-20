"use client"
import { useState, useEffect } from "react"
import { TimberAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Search, ArrowRightLeft, ArrowRight, Package2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TransfersPage() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    TimberAPI.getTransfers().then((res: any) => setData(res.items || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = (Array.isArray(data) ? data : []).filter(item => 
    item.transferNumber?.toLowerCase().includes(search.toLowerCase()) ||
    item.fromLocation?.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.toLocation?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" /> Warehouse Transfers
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Manage inventory stock transfers between locations and warehouses.
          </p>
        </div>
        <Button onClick={() => router.push('/inventory/transfers/create')} className="w-full sm:w-auto bg-primary hover:bg-primary/90 font-semibold h-10">
          <Plus className="w-4 h-4 mr-2" /> Create Transfer
        </Button>
      </div>

      <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package2 className="w-4 h-4 text-primary" /> Transfer Registry
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-70" />
              <Input type="search" placeholder="Search transfer no or location..." className="pl-9 bg-background h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <ArrowRightLeft className="w-10 h-10 text-muted-foreground mb-4 opacity-40" />
              <h3 className="text-base font-semibold text-foreground mb-1">No transfer records found</h3>
              <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">Belum ada data perpindahan stok kayu atau tidak ada yang cocok dengan pencarian Anda.</p>
              <Button variant="outline" className="font-semibold" onClick={() => router.push('/inventory/transfers/create')}><Plus className="w-4 h-4 mr-2" /> Buat Transfer Baru</Button>
            </div>
          ) : (
            <div className="overflow-x-auto w-full sm:max-w-none">
              <table className="min-w-[900px] md:min-w-full w-full text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Transfer No</th>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Date</th>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Route (From &rarr; To)</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Qty (PCS)</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Total M³</th>
                    <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Status</th>
                    <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-6 font-semibold text-foreground/90">{t.transferNumber || "-"}</td>
                      <td className="py-3 px-6 font-medium text-muted-foreground">{t.transferDate ? new Date(t.transferDate).toLocaleDateString("id-ID") : "-"}</td>
                      <td className="py-3 px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <span className="font-semibold text-foreground/80">{t.fromLocation?.name || "-"}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                          <span className="text-muted-foreground sm:hidden text-[11px] uppercase tracking-wider font-bold">To</span>
                          <span className="font-semibold text-primary">{t.toLocation?.name || "-"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-foreground/90 text-[15px]">
                        {t.items?.reduce((s:number, i:any)=>s+i.quantityPcs, 0)}
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-emerald-600 dark:text-emerald-500 text-[15px]">
                        {t.items?.reduce((s:number, i:any)=>s+i.volumeM3, 0).toFixed(4)}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <Badge 
                          variant={t.status === "POSTED" ? "default" : (t.status === "DRAFT" ? "secondary" : "destructive")}
                          className={t.status === "POSTED" ? "bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-wider text-[11px]" : "font-bold uppercase tracking-wider text-[11px]"}
                        >
                          {t.status || 'DRAFT'}
                        </Badge>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => router.push(`/inventory/transfers/${t.id}`)}
                          className="h-8 px-3 text-[12px] font-semibold text-primary hover:text-primary hover:bg-primary/10"
                        >
                          View Detail <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
