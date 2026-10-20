"use client"
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Factory, Package, CheckCircle2, AlertTriangle, Cog, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ManufacturingOverviewPage() {
 const router = useRouter()
 const [orders, setOrders] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState(false)

 useEffect(() => {
 api.get('/manufacturing/mo')
 .then(res => setOrders(Array.isArray(res.data) ? res.data : []))
 .catch(() => setError(true))
 .finally(() => setLoading(false))
 }, [])

 const countByStatus = (status: string) => orders.filter(o => o.status === status).length

 const navCards = [
 { title: 'Bills of Materials', sub: 'Product structures & components', url: '/manufacturing/bom', icon: Package },
 { title: 'MRP', sub: 'Material requirements planning', url: '/manufacturing/mrp', icon: Cog },
 { title: 'Manufacturing Orders', sub: 'Production order management', url: '/manufacturing/orders', icon: Factory },
 { title: 'Quality Control', sub: 'Quality checks & dispositions', url: '/manufacturing/quality', icon: CheckCircle2 },
 { title: 'Work Centers', sub: 'Capacity & scheduling', url: '/manufacturing/workcenter', icon: AlertTriangle },
 { title: 'Scheduling', sub: 'Production schedule generation', url: '/manufacturing/scheduling', icon: Cog },
 ]

 return (
 <div className="space-y-6 pb-10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Manufacturing</h1>
 <p className="text-muted-foreground mt-1">Oversee production, MRP, BOM, and quality control operations.</p>
 </div>
 <Button className="" onClick={() => router.push('/manufacturing/orders')}>
 <Factory className="w-4 h-4 mr-2" /> New Manufacturing Order
 </Button>
 </div>

 {/* KPIs */}
 {!error && (
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label: 'Draft', value: countByStatus('DRAFT'), color: 'text-muted-foreground' },
 { label: 'In Progress', value: countByStatus('IN_PROGRESS'), color: 'text-primary' },
 { label: 'Completed', value: countByStatus('DONE'), color: 'text-primary' },
 { label: 'Cancelled', value: countByStatus('CANCELLED'), color: 'text-red-600' },
 ].map(kpi => (
 <Card key={kpi.label} className="shadow-sm">
 <CardContent className="pt-6">
 <p className="text-sm text-muted-foreground">{kpi.label}</p>
 {loading ? (
 <div className="h-8 w-12 bg-muted/50 rounded animate-pulse mt-1" />
 ) : (
 <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 {/* Module nav */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {navCards.map(card => (
 <Card key={card.url} className="shadow-sm cursor-pointer hover:border-indigo-300 group transition-colors" onClick={() => router.push(card.url)}>
 <CardContent className="pt-6">
 <div className="flex gap-4 items-start">
 <div className="p-2 rounded-md bg-muted/50 mt-0.5"><card.icon className="h-5 w-5 text-muted-foreground" /></div>
 <div className="flex-1">
 <p className="font-semibold group-hover:text-primary transition-colors">{card.title}</p>
 <p className="text-sm text-muted-foreground mt-0.5">{card.sub}</p>
 </div>
 <ExternalLink className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary mt-1 transition-colors" />
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {/* Recent MOs */}
 {!error && (
 <Card className="shadow-sm">
 <CardHeader className="border-b pb-4">
 <div className="flex justify-between items-center">
 <CardTitle className="text-[16px] font-semibold">Recent Manufacturing Orders</CardTitle>
 <Button variant="ghost" size="sm" onClick={() => router.push('/manufacturing/orders')}>View all</Button>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? (
 <div className="flex p-4 md:p-8 justify-center"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>
 ) : orders.length === 0 ? (
 <div className="text-center p-4 md:p-8 text-muted-foreground">No manufacturing orders yet.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-3 px-5 text-left font-medium text-muted-foreground">MO Number</th>
 <th className="p-3 px-5 text-left font-medium text-muted-foreground">Product</th>
 <th className="p-3 px-5 text-center font-medium text-muted-foreground">Qty</th>
 <th className="p-3 px-5 text-center font-medium text-muted-foreground">Status</th>
 </tr>
 </thead>
 <tbody>
 {orders.slice(0, 5).map((mo: any) => (
 <tr key={mo.id} className="border-b last:border-0 hover:bg-muted/60 cursor-pointer transition-colors" onClick={() => router.push('/manufacturing/orders')}>
 <td className="p-3 px-5 font-medium text-primary">{mo.order_number || mo.id}</td>
 <td className="p-3 px-5">{mo.product?.name || mo.product_id}</td>
 <td className="p-3 px-5 text-center">{mo.planned_qty || mo.quantity}</td>
 <td className="p-3 px-5 text-center"><span className="text-xs font-medium bg-muted px-2 py-1 rounded-full">{mo.status}</span></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </div>
 )
}
