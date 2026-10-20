"use client"
import { useState, useEffect } from"react"
import { TimberAPI } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Badge } from"@/components/ui/badge"
import { Loader2, Plus, Search, ChevronRight, MoreHorizontal, Eye, Pencil, Trash } from"lucide-react"
import { useRouter } from"next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

export default function InputLogsPage() {
  const { toast } = useToast();
  const handleDelete = async (e: any, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this log?")) return;
    try {
      await TimberAPI.deleteInputLog(id);
      toast({ title: "Success", description: "Log deleted." });
      fetchLogs();
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Failed to delete", variant: "destructive" });
    }
  };
 const router = useRouter()
 const [data, setData] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState("")

 const fetchLogs = () => {
   TimberAPI.getInputLogs().then((res: any) => setData(res.items || [])).catch(console.error).finally(() => setLoading(false))
 }
 useEffect(() => {
   fetchLogs()
 }, [])

 const filtered = (Array.isArray(data) ? data : []).filter(item => 
 item.inputNumber?.toLowerCase().includes(search.toLowerCase()) ||
 item.batch?.toLowerCase().includes(search.toLowerCase())
 )

 return (
 <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
 <div>
 <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-6 h-6"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg> Input Log (Produksi)</h1>
 <p className="text-sm text-muted-foreground max-w-2xl">Material kayu yang disiapkan dan dialokasikan untuk proses produksi Sawmill.</p>
 </div>
 <Button onClick={() => router.push('/inventory/input-logs/create')} className="w-full sm:w-auto shadow-sm font-semibold tracking-wide">
 <Plus className="w-4 h-4 mr-2" /> Create Input Log
 </Button>
 </div>

 <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <CardTitle className="text-base font-bold">Data Input Log</CardTitle>
 <div className="relative w-full sm:w-64">
<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-70" />
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input type="search" placeholder="Search number..." className="pl-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div> : filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center">
 <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-muted-foreground mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
 <h3 className="text-base font-semibold text-foreground mb-1">No records found</h3>
 <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">Belum ada Input Log.</p>
 </div>
 ) : (
 <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30 border-b border-border">
 <tr>
 <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Input Number</th>
 <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Date</th>
 <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Partai</th>
 <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Total M&sup3;</th>
 <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Processed</th>
 <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Remaining</th>
 <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Output M&sup3;</th>
 <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Status</th>
 <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Action</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map(log => (
 <tr key={log.id} className="border-b last:border-0 hover:bg-muted/60 cursor-pointer transition-colors" onClick={() => router.push(`/inventory/input-logs/${log.id}`)}>
 <td className="py-3 px-6 font-semibold text-foreground/90">{log.inputNumber}</td>
 <td className="py-3 px-6 text-[13px]">{new Date(log.date).toLocaleDateString("id-ID")}</td>
 <td className="py-3 px-6 text-[13px]">{log.batch ||"-"}</td>
 <td className="py-3 px-6 text-right font-bold text-foreground/90">{log.totalVolume?.toFixed(4) || "0.0000"}</td>
 <td className="py-3 px-6 text-right font-medium text-blue-500/90">{log.processedVolume?.toFixed(4) || "0.0000"}</td>
 <td className="py-3 px-6 text-right font-medium text-orange-500/90">{log.remainingVolume?.toFixed(4) || "0.0000"}</td>
 <td className="py-3 px-6 text-right font-bold text-emerald-500">{log.outputVolume?.toFixed(4) || "0.0000"}</td>
 <td className="py-3 px-6 text-center text-[13px]">
    {log.status === "AVAILABLE" ? <span className="inline-flex items-center rounded-sm bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive uppercase tracking-wider">AVAILABLE</span> :
     log.status === "PROCESSING" ? <span className="inline-flex items-center rounded-sm bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 uppercase tracking-wider">PROCESSING</span> :
     log.status === "DONE" ? <span className="inline-flex items-center rounded-sm bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 uppercase tracking-wider">DONE</span> :
     <span className="inline-flex items-center rounded-sm bg-secondary/80 text-secondary-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">{log.status}</span>}
 </td>
 <td className="py-3 px-6 text-center text-[13px]" onClick={e => e.stopPropagation()}>
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 border-0 bg-transparent">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/inventory/input-logs/${log.id}`)}><Eye className="w-4 h-4 mr-2" /> View Details</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/inventory/input-logs/${log.id}/edit`)}><Pencil className="w-4 h-4 mr-2" /> Edit Log</DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleDelete(e, log.id)} className="text-destructive"><Trash className="w-4 h-4 mr-2" /> Delete Log</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </td>
 </tr>
 ))
 }
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}


