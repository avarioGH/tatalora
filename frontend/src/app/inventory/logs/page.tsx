"use client"
import { useState, useEffect } from"react"
import { TimberAPI } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Badge } from"@/components/ui/badge"
import { Loader2, Plus, Search, ChevronRight, Package, MoreHorizontal, Pencil, Trash, Eye } from"lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from"next/navigation"

export default function RawLogsPage() {
 const router = useRouter()
 const { toast } = useToast()
 const [data, setData] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState("");
 const [dateFilter, setDateFilter] = useState("");

 useEffect(() => { fetchLogs() }, [])

 const fetchLogs = async () => {
 setLoading(true)
 try {
 let locationId = undefined;
 if (typeof window !== 'undefined') {
 const stored = localStorage.getItem('active_warehouse');
 if (stored && stored !== 'null' && stored !== 'undefined') {
 const wh = JSON.parse(stored);
 if (wh?.id) locationId = wh.id;
 }
 }
 const res = await TimberAPI.getRawLogs({ locationId })
 setData(res.items || [])
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }

 
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this log?')) return;
    try {
      await TimberAPI.deleteLog(id);
      toast({ title: 'Success', description: 'Log deleted.' });
      fetchLogs();
    } catch (err: any) {
      toast({ title: 'Error', description: (err.response?.data?.error?.message || err.response?.data?.message) || 'Failed to delete log', variant: 'destructive' });
    }
  }

 const filtered = (Array.isArray(data) ? data : []).filter(item => {
 const matchSearch = item.logNumber?.toLowerCase().includes(search.toLowerCase()) || 
 item.barcode?.toLowerCase().includes(search.toLowerCase()) ||
 item.batch?.toLowerCase().includes(search.toLowerCase());
 const itemDate = item.receivingDate || item.createdAt || item.created_at;
 const matchDate = dateFilter && itemDate ? new Date(itemDate).toISOString().split('T')[0] === dateFilter : true;
 return matchSearch && matchDate;
})

 const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === 'AVAILABLE' || s === 'CONFIRMED') return <span className="inline-flex items-center rounded-sm bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success-foreground uppercase tracking-wider">{s}</span>;
    if (s === 'IN_TRIMMING') return <span className="inline-flex items-center rounded-sm bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning-foreground uppercase tracking-wider">{s.replace('_', ' ')}</span>;
    if (s === 'CANCELLED') return <span className="inline-flex items-center rounded-sm bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive uppercase tracking-wider">{s}</span>;
    return <span className="inline-flex items-center rounded-sm bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wider">{s}</span>;
  }

 return (
 <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
 <div>
 <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2"><Package className="w-6 h-6 text-primary" /> Log Kayu (DUKB)</h1>
 <p className="text-sm text-muted-foreground max-w-2xl">Penerimaan kayu bulat dari supplier dan sumber material.</p>
 </div>
 <Button onClick={() => router.push('/inventory/logs/create')} className="w-full sm:w-auto shadow-sm font-semibold tracking-wide">
 <Plus className="w-4 h-4 mr-2" /> Register Raw Log
 </Button>
 </div>

 <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <CardTitle className="text-base font-bold">Data Log Kayu</CardTitle>
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-70" />
 <Input type="search" placeholder="Search log no, barcode..." className="pl-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
 </div>
 <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full sm:w-[150px] bg-background" />
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div> : filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center">
 <Package className="w-10 h-10 text-muted-foreground mb-4 opacity-40" />
 <h3 className="text-base font-semibold text-foreground mb-1">No raw logs yet</h3>
 <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">There are no raw timber logs matching the current warehouse or filter.</p>
 <Button onClick={(e) => { e.stopPropagation(); router.push('/inventory/logs/create'); }} className="w-full sm:w-auto h-10 px-6 shadow-sm">
 <Plus className="w-4 h-4 mr-2" /> Register Raw Log
 </Button>
 </div>
 ) : (
 <div className="overflow-x-auto w-full max-w-[100vw] sm:max-w-none">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30 border-b border-border">
 <tr>
 <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Date</th>
<th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Log No</th>
 <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Species</th>
 <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Partai</th>
 <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Length</th>
 <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">&Oslash; Avg</th>
 <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Net M&sup3;</th>
 <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Status</th>
 <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Action</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map(log => (
 <tr key={log.id} className="border-b last:border-0 hover:bg-muted/60 cursor-pointer transition-colors" onClick={() => router.push(`/inventory/logs/${log.id}`)}>
 <td className="py-3 px-6 text-[13px] text-muted-foreground">{new Date(log.receivingDate || log.createdAt || Date.now()).toLocaleDateString('id-ID')}</td>
 <td className="py-3 px-6 font-semibold text-foreground/90">{log.logNumber}</td>
 <td className="py-3 px-6 text-[13px]">{log.species}</td>
 <td className="py-3 px-6 text-[13px]">{log.batch || '-'}</td>
 <td className="py-3 px-6 text-right text-[13px]">{log.originalLength} m</td>
 <td className="py-3 px-6 text-right text-[13px]">{log.averageDiameter} cm</td>
 <td className="py-3 px-6 text-right font-bold text-foreground/90">{log.netVolume}</td>
 <td className="py-3 px-6 text-center text-[13px]">{getStatusBadge(log.status)}</td>
 <td className="py-3 px-6 text-center text-[13px]" onClick={e => e.stopPropagation()}>
  <DropdownMenu>
    <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 border-0 bg-transparent">
      <MoreHorizontal className="h-4 w-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => router.push(`/inventory/logs/${log.id}`)}>
        <Eye className="w-4 h-4 mr-2" /> View Details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => router.push(`/inventory/logs/${log.id}/edit`)}>
        <Pencil className="w-4 h-4 mr-2" /> Edit Log
      </DropdownMenuItem>
      {log.status === 'AVAILABLE' && (
        <DropdownMenuItem onClick={(e) => handleDelete(e, log.id)} className="text-destructive">
          <Trash className="w-4 h-4 mr-2" /> Delete Log
        </DropdownMenuItem>
      )}
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


