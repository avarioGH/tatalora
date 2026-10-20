"use client"
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Search, CheckCircle2, AlertTriangle, Play, ChevronLeft } from 'lucide-react'
import { useToast } from"@/hooks/use-toast"

export default function QualityPage() {
 const { toast } = useToast()
 const [data, setData] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState("")

 useEffect(() => { fetchChecks() }, [])

 const fetchChecks = async () => {
 try {
 setLoading(true)
 const res = await api.get('/manufacturing/quality/checks')
 setData(Array.isArray(res.data) ? res.data : [])
 } catch (err) { console.error(err) } finally { setLoading(false) }
 }

 const completeCheck = async (id: string, result: string) => {
 try {
 await api.post(`/manufacturing/quality/checks/${id}/complete`, { result })
 toast({ title:"Check Completed", description: `Quality check marked as ${result}.` })
 fetchChecks()
 } catch (err: any) {
 toast({ title:"Error", description: (err.response?.data?.error?.message || err.response?.data?.message) ||"Failed to complete check.", variant:"destructive" })
 }
 }

 const filtered = (Array.isArray(data) ? data : []).filter(item =>
 item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
 )

 const getStatusBadge = (status: string, result: string) => {
 if (status === 'COMPLETED') {
 return result === 'PASS' 
 ? <Badge className="bg-emerald-500">PASS</Badge>
 : <Badge variant="destructive">FAIL</Badge>
 }
 return <Badge variant="secondary">PENDING</Badge>
 }

 return (
 <div className="space-y-6 pb-10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Quality Control</h1>
 <p className="text-muted-foreground mt-1">Manage quality checks for incoming goods and production output.</p>
 </div>
 </div>
 <Card className="shadow-sm">
 <CardHeader className="pb-4 border-b border-border/40">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <CardTitle className="text-[16px] font-semibold">Quality Inspections</CardTitle>
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input type="search" placeholder="Search reference..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? <div className="flex p-12 justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div> : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Reference</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Product</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Check Point</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status / Result</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Action</th>
 </tr>
 </thead>
 <tbody>
 {filtered.length === 0 ? (
 <tr><td colSpan={5} className="text-center p-12 text-muted-foreground">No quality checks found.</td></tr>
 ) : filtered.map((item) => (
 <tr key={item.id} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
 <td className="py-3.5 px-6 font-semibold text-primary text-[13px]">{item.reference || '-'}</td>
 <td className="p-4 px-6 font-medium">{item.product?.name || item.product_id || '-'}</td>
 <td className="py-3.5 px-6 text-[13px]">{item.point?.name || item.point_id || 'Standard Check'}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(item.status, item.result)}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">
 {item.status !== 'COMPLETED' ? (
 <div className="flex items-center justify-center gap-2">
 <Button size="sm" variant="outline" className="text-primary hover:bg-emerald-50" onClick={() => completeCheck(item.id, 'PASS')}>Pass</Button>
 <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => completeCheck(item.id, 'FAIL')}>Fail</Button>
 </div>
 ) : (
 <Button size="sm" variant="ghost" disabled>Completed</Button>
 )}
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
