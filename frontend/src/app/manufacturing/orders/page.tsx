"use client"
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search, ChevronLeft, Factory, CheckCircle2, Play, AlertCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from"@/hooks/use-toast"

export default function MOPage() {
 const { toast } = useToast()
 const router = useRouter()
 const [data, setData] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState("")
 const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
 const [actionLoading, setActionLoading] = useState(false)

 useEffect(() => { fetchMOs() }, [])

 const fetchMOs = async () => {
 try {
 setLoading(true)
 const res = await api.get('/manufacturing/mo')
 setData(Array.isArray(res.data) ? res.data : [])
 } catch (err) { console.error(err) } finally { setLoading(false) }
 }

 const handleAction = async (action: string) => {
 setActionLoading(true)
 try {
 await api.post(`/manufacturing/mo/${selectedDoc.id}/${action}`)
 toast({ title:"Success", description: `Manufacturing order updated.` })
 const res = await api.get(`/manufacturing/mo/${selectedDoc.id}`)
 setSelectedDoc(res.data)
 fetchMOs()
 } catch (err: any) {
 toast({ title:"Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || `Failed to ${action} MO.`, variant:"destructive" })
 } finally { setActionLoading(false) }
 }

 const getStatusBadge = (status: string) => {
 switch(status) {
 case 'DRAFT': return <Badge variant="secondary">Draft</Badge>
 case 'RESERVED': return <Badge className="bg-blue-500 hover:bg-blue-600">Reserved</Badge>
 case 'IN_PROGRESS': return <Badge className="bg-amber-500 hover:bg-amber-600">In Progress</Badge>
 case 'DONE': return <Badge className="">Done</Badge>
 case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>
 default: return <Badge variant="outline">{status || 'Draft'}</Badge>
 }
 }

 const filtered = (Array.isArray(data) ? data : []).filter(item =>
 item.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
 )

 if (selectedDoc) {
 return (
 <div className="space-y-6 animate-in fade-in duration-300 pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
 <div className="flex items-center gap-4">
 <Button variant="outline" size="icon" onClick={() => setSelectedDoc(null)}><ChevronLeft className="h-4 w-4" /></Button>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">{selectedDoc.order_number || selectedDoc.id.slice(0,8)}</h1>
 {getStatusBadge(selectedDoc.status)}
 </div>
 <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2"><Factory className="h-4 w-4" /> Manufacturing Order</p>
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 {(selectedDoc.status === 'DRAFT') && (
 <Button onClick={() => handleAction('reserve')} disabled={actionLoading} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
 {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Reserve Materials
 </Button>
 )}
 {(selectedDoc.status === 'RESERVED' || selectedDoc.status === 'DRAFT') && (
 <Button onClick={() => handleAction('start')} disabled={actionLoading} className="bg-amber-600 hover:bg-amber-700 text-white">
 {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Start Production
 </Button>
 )}
 {(selectedDoc.status === 'IN_PROGRESS') && (
 <Button onClick={() => handleAction('complete')} disabled={actionLoading} className="">
 {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Mark as Done
 </Button>
 )}
 {(selectedDoc.status !== 'DONE' && selectedDoc.status !== 'CANCELLED') && (
 <Button onClick={() => handleAction('cancel')} disabled={actionLoading} variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700">
 <XCircle className="w-4 h-4 mr-2" /> Cancel MO
 </Button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="md:col-span-2 shadow-sm">
 <CardHeader className="border-b bg-muted/10 pb-4">
 <CardTitle className="text-[16px] font-semibold">Material Components</CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30">
 <tr>
 <th className="p-4 text-left font-medium text-muted-foreground">Component</th>
 <th className="p-4 text-right font-medium text-muted-foreground">Required</th>
 <th className="p-4 text-right font-medium text-muted-foreground">Reserved</th>
 <th className="p-4 text-right font-medium text-muted-foreground">Consumed</th>
 </tr>
 </thead>
 <tbody>
 {(selectedDoc.items || []).length === 0 ? (
 <tr><td colSpan={4} className="p-4 md:p-8 text-center text-muted-foreground">No components.</td></tr>
 ) : selectedDoc.items.map((item: any, i: number) => (
 <tr key={i} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
 <td className="p-4 font-medium">{item.product?.name || item.product_id}</td>
 <td className="p-4 text-right">{item.required_qty || item.quantity}</td>
 <td className="p-4 text-right text-blue-600">{item.reserved_qty || 0}</td>
 <td className="p-4 text-right font-medium text-primary">{item.consumed_qty || 0}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>

 <Card className="shadow-sm h-fit">
 <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-[16px] font-semibold">Order Details</CardTitle></CardHeader>
 <CardContent className="space-y-4 pt-6">
 <div><p className="text-sm font-medium text-muted-foreground mb-1">Product to Produce</p>
 <p className="font-medium text-primary cursor-pointer hover:underline" onClick={() => router.push('/inventory/products')}>
 {selectedDoc.product?.name || selectedDoc.product_id || '-'}
 </p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div><p className="text-sm font-medium text-muted-foreground mb-1">Planned Qty</p><p className="font-bold text-lg">{selectedDoc.planned_qty || selectedDoc.quantity}</p></div>
 <div><p className="text-sm font-medium text-muted-foreground mb-1">Produced</p><p className="font-bold text-lg text-primary">{selectedDoc.produced_qty || 0}</p></div>
 </div>
 <div><p className="text-sm font-medium text-muted-foreground mb-1">BOM Version</p><p className="font-medium text-sm">{selectedDoc.bom?.code || selectedDoc.bom_id || 'Manual'}</p></div>
 <div className="pt-4 border-t">
 <p className="text-xs text-muted-foreground">Expected Start: {selectedDoc.date_planned_start ? new Date(selectedDoc.date_planned_start).toLocaleDateString() : '-'}</p>
 <p className="text-xs text-muted-foreground mt-1">Expected End: {selectedDoc.date_planned_finished ? new Date(selectedDoc.date_planned_finished).toLocaleDateString() : '-'}</p>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-6 pb-10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Manufacturing Orders</h1>
 <p className="text-muted-foreground mt-1">Manage production execution, materials, and output.</p>
 </div>
 <Link href="/manufacturing/orders/create"><Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> Create MO</Button></Link>
 </div>
 <Card className="shadow-sm">
 <CardHeader className="pb-4 border-b border-border/40">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <CardTitle className="text-[16px] font-semibold">Orders List</CardTitle>
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input type="search" placeholder="Search MO..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? <div className="flex p-12 justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div> : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Order No</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Product</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Planned</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Produced</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
 </tr>
 </thead>
 <tbody>
 {filtered.length === 0 ? (
 <tr><td colSpan={5} className="text-center p-12 text-muted-foreground">No orders found.</td></tr>
 ) : filtered.map((item) => (
 <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedDoc(item)}>
 <td className="py-3.5 px-6 font-semibold text-primary text-[13px] dark:text-primary">{item.order_number || item.id?.slice(0,8)}</td>
 <td className="p-4 px-6 font-medium">{item.product?.name || item.product_id || '-'}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">{item.planned_qty || item.quantity}</td>
 <td className="p-4 px-6 text-center font-medium text-primary">{item.produced_qty || 0}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(item.status)}</td>
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
