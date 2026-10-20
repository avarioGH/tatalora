"use client"
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search, Filter, ChevronLeft, Package, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function BOMPage() {
 const router = useRouter()
 const [data, setData] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState("")
 const [selectedDoc, setSelectedDoc] = useState<any | null>(null)

 useEffect(() => {
 api.get('/manufacturing/bom')
 .then(res => setData(Array.isArray(res.data) ? res.data : []))
 .catch(console.error)
 .finally(() => setLoading(false))
 }, [])

 const getStatusBadge = (status: string) => {
 switch(status) {
 case 'ACTIVE': return <Badge className="">Active</Badge>
 case 'DRAFT': return <Badge variant="secondary" className="bg-muted/50 text-foreground">Draft</Badge>
 case 'OBSOLETE': return <Badge variant="destructive">Obsolete</Badge>
 default: return <Badge variant="outline">{status || 'Draft'}</Badge>
 }
 }

 const filtered = (Array.isArray(data) ? data : []).filter(item =>
 item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
 )

 if (selectedDoc) {
 return (
 <div className="space-y-6 animate-in fade-in duration-300 pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <Button variant="outline" size="icon" onClick={() => setSelectedDoc(null)}><ChevronLeft className="h-4 w-4" /></Button>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">{selectedDoc.code || selectedDoc.name}</h1>
 {getStatusBadge(selectedDoc.status)}
 </div>
 <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Bill of Materials</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" onClick={() => router.push('/manufacturing/orders')}>
 <ArrowRight className="w-4 h-4 mr-2" /> Create Manufacturing Order
 </Button>
 <Button variant="outline" onClick={() => router.push('/inventory/products')}>
 <Package className="w-4 h-4 mr-2" /> View Product
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="md:col-span-2 shadow-sm">
 <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-[16px] font-semibold">Components</CardTitle></CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30">
 <tr>
 <th className="p-4 text-left font-medium text-muted-foreground">Component</th>
 <th className="p-4 text-center font-medium text-muted-foreground">Quantity</th>
 <th className="p-4 text-left font-medium text-muted-foreground">Unit</th>
 </tr>
 </thead>
 <tbody>
 {(selectedDoc.items || []).length === 0 ? (
 <tr><td colSpan={3} className="p-4 md:p-8 text-center text-muted-foreground">No components defined.</td></tr>
 ) : selectedDoc.items.map((item: any, i: number) => (
 <tr key={i} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
 <td className="p-4 font-medium">{item.product?.name || item.product_id}</td>
 <td className="p-4 text-center font-bold">{item.quantity}</td>
 <td className="p-4 text-muted-foreground">{item.unit?.name || item.unit_id || '-'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>

 <Card className="shadow-sm h-fit">
 <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-[16px] font-semibold">BOM Details</CardTitle></CardHeader>
 <CardContent className="space-y-4 pt-6">
 <div><p className="text-sm font-medium text-muted-foreground mb-1">BOM Code</p><p className="font-medium">{selectedDoc.code || '-'}</p></div>
 <div><p className="text-sm font-medium text-muted-foreground mb-1">Product</p>
 <p className="font-medium text-primary cursor-pointer hover:underline" onClick={() => router.push('/inventory/products')}>
 {selectedDoc.product?.name || selectedDoc.product_id || '-'}
 </p>
 </div>
 <div><p className="text-sm font-medium text-muted-foreground mb-1">Produces Quantity</p><p className="font-medium">{selectedDoc.quantity || 1}</p></div>
 <div><p className="text-sm font-medium text-muted-foreground mb-1">Status</p>{getStatusBadge(selectedDoc.status)}</div>
 <div className="pt-4 border-t">
 <p className="text-xs text-muted-foreground">Created: {selectedDoc.created_at ? new Date(selectedDoc.created_at).toLocaleDateString('id-ID') : '-'}</p>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Bills of Materials</h1>
 <p className="text-muted-foreground mt-1">Define product structures and component requirements for manufacturing.</p>
 </div>
 <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> New BOM</Button>
 </div>
 <Card className="shadow-sm">
 <CardHeader className="pb-4 border-b border-border/40">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <CardTitle className="text-[16px] font-semibold">Bill of Materials Register</CardTitle>
 <div className="flex items-center gap-2">
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input type="search" placeholder="Search BOM..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 </div>
 <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? <div className="flex p-12 justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div> : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Code</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Name</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Product</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Components</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
 </tr>
 </thead>
 <tbody>
 {filtered.length === 0 ? (
 <tr><td colSpan={5} className="text-center p-12 text-muted-foreground">No Bills of Materials found.</td></tr>
 ) : filtered.map((item) => (
 <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => setSelectedDoc(item)}>
 <td className="py-3.5 px-6 font-semibold text-primary text-[13px] dark:text-primary">{item.code || item.id?.slice(0,8)}</td>
 <td className="p-4 px-6 font-medium">{item.name || '-'}</td>
 <td className="py-3.5 px-6 text-[13px]">{item.product?.name || item.product_id || '-'}</td>
 <td className="p-4 px-6 text-center text-muted-foreground">{item.items?.length || 0}</td>
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
