"use client"
import { useState, useEffect } from "react"
import { ProductionAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Search, Hammer } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ProductionPage() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    ProductionAPI.getProcesses().then((res: any) => setData(res.items || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = (Array.isArray(data) ? data : []).filter(item => 
    item.processNumber?.toLowerCase().includes(search.toLowerCase()) ||
    item.type?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (s: string) => {
    const status = (s || "").toUpperCase();
    if (status === 'COMPLETED' || status === 'CONFIRMED') return <span className="inline-flex items-center rounded-sm bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success-foreground uppercase tracking-wider">{status}</span>;
    if (status === 'DRAFT') return <span className="inline-flex items-center rounded-sm bg-secondary/80 text-secondary-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">DRAFT</span>;
    if (status === 'CANCELLED') return <span className="inline-flex items-center rounded-sm bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive uppercase tracking-wider">CANCELLED</span>;
    return <span className="inline-flex items-center rounded-sm bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wider">{status}</span>;
  }

  const getTypeBadge = (type: string) => {
    return <span className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30">{type}</span>;
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Hammer className="w-6 h-6 text-primary" /> Production Process
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">Proses produksi kayu gergajian dan transformasi material.</p>
        </div>
        <Button onClick={() => router.push('/inventory/production/create')} className="w-full sm:w-auto shadow-sm font-semibold tracking-wide">
          <Plus className="w-4 h-4 mr-2" /> New Production
        </Button>
      </div>

      <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-base font-bold">Data Produksi</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-70" />
              <Input type="search" placeholder="Search No. Process..." className="pl-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <Hammer className="w-10 h-10 text-muted-foreground mb-4 opacity-40" />
              <h3 className="text-base font-semibold text-foreground mb-1">No production records</h3>
              <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">Belum ada proses produksi yang terdaftar.</p>
              <Button onClick={(e) => { e.stopPropagation(); router.push('/inventory/production/create'); }} className="w-full sm:w-auto h-10 px-6 shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> New Production
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto w-full sm:max-w-none">
              <table className="min-w-[700px] md:min-w-full w-full text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">No. Process</th>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Tanggal</th>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Process Type</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Inputs</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Outputs</th>
                    <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(process => {
                    return (
                      <tr key={process.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => router.push(`/inventory/production/${process.id}`)}>
                        <td className="py-3 px-6 font-semibold text-foreground/90">{process.processNumber || process.processNo}</td>
                        <td className="py-3 px-6 text-[13px] text-muted-foreground">{new Date(process.date || process.processDate || Date.now()).toLocaleDateString("id-ID")}</td>
                        <td className="py-3 px-6 text-[13px]">{getTypeBadge(process.type || process.processType)}</td>
                        <td className="py-3 px-6 text-right font-medium text-muted-foreground">{process.inputs?.length || 0} items</td>
                        <td className="py-3 px-6 text-right font-medium text-foreground/90">{process.outputs?.length || 0} items</td>
                        <td className="py-3 px-6 text-center">{getStatusBadge(process.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
