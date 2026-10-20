"use client"
import { useState, useEffect } from"react"
import { TimberAPI, InventoryAPI } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Checkbox } from"@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ArrowLeft, Save, Calculator } from"lucide-react"
import { useRouter, useSearchParams } from"next/navigation"
import { useToast } from"@/hooks/use-toast"

export default function CreateInputLogPage() {
 const router = useRouter()
  const searchParams = useSearchParams()
  const partaiId = searchParams.get('partaiId') || ''
 const { toast } = useToast()
 const [warehouses, setWarehouses] = useState<any[]>([])
 const [availableLogs, setAvailableLogs] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [submitting, setSubmitting] = useState(false)

 const [form, setForm] = useState({ date:"", shift:"1", machine:"1", locationId:"", batch:"", notes:"" })
 const [selectedIds, setSelectedIds] = useState<string[]>([])

 useEffect(() => {
    Promise.allSettled([
      InventoryAPI.getWarehouses(),
      TimberAPI.getAvailableTrimmedLogs(partaiId ? { partaiId } : {})
    ]).then(([wRes, lRes]) => {
      if (wRes.status === 'fulfilled') {
        const wData = wRes.value;
        setWarehouses(Array.isArray(wData) ? wData : (wData?.items || wData?.data || []))
      }
      if (lRes.status === 'fulfilled') {
        const lData = lRes.value;
        setAvailableLogs(Array.isArray(lData) ? lData : (lData?.items || lData?.data || []))
      } else {
        console.error('Failed to load available trimmed logs:', lRes.reason)
      }
    }).finally(() => setLoading(false))
 }, [])

 const handleSelect = (id: string, checked: boolean) => {
 setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id))
 }

 const selectedLogs = (Array.isArray(availableLogs) ? availableLogs : []).filter(l => selectedIds.includes(l.id))
 const totalLength = selectedLogs.reduce((sum, l) => sum + (l.length || 0), 0)
 const totalGross = selectedLogs.reduce((sum, l) => sum + (l.grossVolume || 0), 0)
 const totalNet = selectedLogs.reduce((sum, l) => sum + (l.netVolume || 0), 0)

 const handleSubmit = async (e: any) => {
 e.preventDefault()
 if (selectedIds.length === 0) {
 toast({ title:"Validation Error", description:"Please select at least one trimmed log.", variant:"destructive" })
 return
 }
 setSubmitting(true)
 try {
 await TimberAPI.createInputLog({ ...form, trimmedLogIds: selectedIds })
 toast({ title:"Success", description:"Input Log created successfully." })
 router.push('/inventory/input-logs')
 } catch (err: any) {
 toast({ title:"Error", description: (err.response?.data?.error?.message || err.response?.data?.message) ||"Failed to create.", variant:"destructive" })
 } finally {
 setSubmitting(false)
 }
 }

 if (loading) return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

 return (
 <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
 <div className="flex items-center gap-4 border-b pb-4">
 <Button variant="outline" size="icon" onClick={() => router.push('/inventory/input-logs')}><ArrowLeft className="w-4 h-4" /></Button>
 <div>
 <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Create Input Log</h1>
 <p className="text-muted-foreground mt-1">Assign trimmed logs for production.</p>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-base font-bold">General Information</CardTitle></CardHeader>
 <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
 <div className="space-y-2"><label className="text-sm font-medium">Shift</label><Select value={form.shift} onValueChange={(val) => setForm({...form, shift: val || ''})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="1">Shift 1</SelectItem><SelectItem value="2">Shift 2</SelectItem><SelectItem value="3">Shift 3</SelectItem></SelectContent></Select></div>
 <div className="space-y-2"><label className="text-sm font-medium">Machine</label><Select value={form.machine} onValueChange={(val) => setForm({...form, machine: val || ''})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="1">MSAW-1</SelectItem><SelectItem value="2">MSAW-2</SelectItem><SelectItem value="3">MSAW-3</SelectItem></SelectContent></Select></div>
 <div className="space-y-2"><label className="text-sm font-medium">Partai</label><Input value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} /></div>
 <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">Location</label><Select value={form.locationId} onValueChange={(val) => setForm({...form, locationId: val ||""})}><SelectTrigger><SelectValue placeholder="Select Warehouse..."/></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name || w.code || w.id}</SelectItem>)}</SelectContent></Select></div>
 </CardContent>
 </Card>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2">
 <Card className="shadow-sm h-full">
 <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-base font-bold">Select Trimmed Logs</CardTitle></CardHeader>
 <CardContent className="p-0">
 <div className="max-h-[400px] overflow-y-auto">
    <Table>
   <TableHeader className="bg-muted/50 sticky top-0 z-10">
   <TableRow>
   <TableHead className="w-10"></TableHead>
   <TableHead>CODE</TableHead>
   <TableHead>JENIS</TableHead>
   <TableHead className="text-right">PJG (m)</TableHead>
   <TableHead className="text-right">PKL (cm)</TableHead>
   <TableHead className="text-right">UJUNG (cm)</TableHead>
   <TableHead className="text-right">RT (cm)</TableHead>
   <TableHead className="text-right">M&sup3;</TableHead>
   </TableRow>
   </TableHeader>
   <TableBody>
   {availableLogs.length === 0 ? <TableRow><TableCell colSpan={8} className="p-4 md:p-8 text-center text-muted-foreground">No available trimmed logs.</TableCell></TableRow> :
   availableLogs.map(log => (
   <TableRow key={log.id} className="hover:bg-muted/20">
   <TableCell className="text-center"><Checkbox checked={selectedIds.includes(log.id)} onCheckedChange={(checked) => handleSelect(log.id, !!checked)} /></TableCell>
   <TableCell className="font-medium">{log.trimNumber}</TableCell>
   <TableCell>{log.species || log.rawLog?.species || "-"}</TableCell>
   <TableCell className="text-right">{log.length}</TableCell>
   <TableCell className="text-right">{log.diameter1 || log.diameter2 || 0}</TableCell>
   <TableCell className="text-right">{log.diameter3 || log.diameter4 || 0}</TableCell>
   <TableCell className="text-right">{Number(log.averageDiameter || 0).toFixed(1)}</TableCell>
   <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{Number(log.netVolume || 0).toFixed(4)}</TableCell>
   </TableRow>
   ))
   }
   </TableBody>
   </Table>
 </div>
 </CardContent>
 </Card>
 </div>

 <div>
 <Card className="shadow-sm border-primary/20 bg-card h-full">
 <CardHeader className="border-b border-border pb-4"><CardTitle className="text-lg flex items-center gap-2 text-primary"><Calculator className="w-5 h-5"/> Summary</CardTitle></CardHeader>
 <CardContent className="pt-6 space-y-4">
 <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Selected Logs</span><span className="font-bold text-lg">{selectedIds.length} PCS</span></div>
 <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Total Length</span><span className="font-medium">{totalLength.toFixed(2)} m</span></div>
 <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Total Gross</span><span className="font-medium">{totalGross.toFixed(4)} m3</span></div>
 <hr className="border-border" />
 <div className="flex justify-between items-center"><span className="text-sm font-bold text-foreground">Total Net m3</span><span className="font-bold text-2xl text-primary">{totalNet.toFixed(4)}</span></div>
 <Button type="submit" disabled={submitting || selectedIds.length === 0} className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg">
 {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Create Input Log
 </Button>
 </CardContent>
 </Card>
 </div>
 </div>
 </form>
 </div>
 )
}







