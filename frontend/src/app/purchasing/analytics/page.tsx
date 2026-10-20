"use client"
import { useState, useEffect } from 'react'
import { PurchasingAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ShoppingCart, Package, FileText, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useRouter } from 'next/navigation'

function MetricCard({ title, value, sub, color, icon: Icon, onClick }: { title: string, value: string, sub?: string, color?: string, icon?: any, onClick?: () => void }) {
 return (
 <Card className={`shadow-sm cursor-pointer hover:border-indigo-300 transition-colors ${onClick ? 'group' : ''}`} onClick={onClick}>
 <CardContent className="pt-6">
 <div className="flex justify-between items-start">
 <div>
 <p className="text-sm font-medium text-muted-foreground">{title}</p>
 <p className={`text-2xl font-bold mt-1 ${color || ''}`}>{value}</p>
 {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
 </div>
 {Icon && <div className="p-2 rounded-md bg-muted/50"><Icon className="h-5 w-5 text-muted-foreground" /></div>}
 </div>
 {onClick && <p className="text-xs text-primary mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink className="h-3 w-3" /> View details</p>}
 </CardContent>
 </Card>
 )
}

export default function PurchasingOverviewPage() {
 const router = useRouter()
 const [data, setData] = useState<any | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState(false)

 useEffect(() => {
 PurchasingAPI.getAnalytics()
 .then((res: any) => setData(res))
 .catch(() => setError(true))
 .finally(() => setLoading(false))
 }, [])

 const fmt = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`

 if (loading) return (
 <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
 )

 if (error || !data) return (
 <div className="space-y-6">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Purchasing Overview</h1>
 <p className="text-muted-foreground mt-1">Procurement analytics and workflow overview.</p>
 </div>
 <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
 <CardContent className="pt-6 flex items-center gap-3">
 <AlertCircle className="h-5 w-5 text-destructive" />
 <div>
 <p className="font-medium">Failed to load analytics data</p>
 <p className="text-sm text-muted-foreground">The backend analytics endpoint may be temporarily unavailable.</p>
 </div>
 <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>Retry</Button>
 </CardContent>
 </Card>
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 <Card className="shadow-sm cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => router.push('/purchasing/requests')}>
 <CardContent className="pt-6"><div className="flex gap-3 items-center"><FileText className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Purchase Requests</p><p className="text-sm text-muted-foreground">View & manage PRs</p></div></div></CardContent>
 </Card>
 <Card className="shadow-sm cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => router.push('/purchasing/rfqs')}>
 <CardContent className="pt-6"><div className="flex gap-3 items-center"><ShoppingCart className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">RFQs</p><p className="text-sm text-muted-foreground">Draft quotations</p></div></div></CardContent>
 </Card>
 <Card className="shadow-sm cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => router.push('/purchasing/orders')}>
 <CardContent className="pt-6"><div className="flex gap-3 items-center"><Package className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Purchase Orders</p><p className="text-sm text-muted-foreground">Confirmed POs</p></div></div></CardContent>
 </Card>
 <Card className="shadow-sm cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => router.push('/purchasing/receipts')}>
 <CardContent className="pt-6"><div className="flex gap-3 items-center"><TrendingUp className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Goods Receipts</p><p className="text-sm text-muted-foreground">Inbound deliveries</p></div></div></CardContent>
 </Card>
 </div>
 </div>
 )

 return (
 <div className="space-y-6 pb-10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Purchasing Overview</h1>
 <p className="text-muted-foreground mt-1">Procurement analytics and Procure-to-Pay workflow status.</p>
 </div>
 <Button className="shadow-sm" onClick={() => router.push('/purchasing/rfqs')}>
 <ShoppingCart className="w-4 h-4 mr-2" /> New RFQ
 </Button>
 </div>

 {/* Quick nav */}
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 <Button variant="outline" className="h-auto flex-col gap-1 py-4" onClick={() => router.push('/purchasing/requests')}>
 <FileText className="h-5 w-5" /><span className="text-xs">Purchase Requests</span>
 </Button>
 <Button variant="outline" className="h-auto flex-col gap-1 py-4" onClick={() => router.push('/purchasing/rfqs')}>
 <ShoppingCart className="h-5 w-5" /><span className="text-xs">RFQs</span>
 </Button>
 <Button variant="outline" className="h-auto flex-col gap-1 py-4" onClick={() => router.push('/purchasing/orders')}>
 <Package className="h-5 w-5" /><span className="text-xs">Purchase Orders</span>
 </Button>
 <Button variant="outline" className="h-auto flex-col gap-1 py-4" onClick={() => router.push('/purchasing/receipts')}>
 <TrendingUp className="h-5 w-5" /><span className="text-xs">Goods Receipts</span>
 </Button>
 </div>

 {/* KPI row */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
 <MetricCard title="Open PO Value" value={fmt(data.open_po_value)} sub="Confirmed purchase orders" icon={Package} onClick={() => router.push('/purchasing/orders')} />
 <MetricCard title="Pending Receipts" value={fmt(data.unreceived_po_value)} sub="Value awaiting delivery" color="text-amber-600" icon={ShoppingCart} onClick={() => router.push('/purchasing/receipts')} />
 <MetricCard title="Outstanding Payable (AP)" value={fmt(data.outstanding_ap)} sub="Total vendor bills unpaid" color="text-red-600" icon={FileText} onClick={() => router.push('/finance/vendor-bills')} />
 </div>

 {/* Top Suppliers Chart */}
 {data.top_suppliers && data.top_suppliers.length > 0 && (
 <Card className="shadow-sm">
 <CardHeader className="border-b pb-4">
 <CardTitle className="text-[16px] font-semibold">Top Suppliers by Spend</CardTitle>
 <CardDescription>Based on confirmed Purchase Orders</CardDescription>
 </CardHeader>
 <CardContent className="pt-6">
 <div className="h-64">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data.top_suppliers} margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
 <XAxis dataKey="partnerId" tick={{ fontSize: 12 }} />
 <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 12 }} />
 <Tooltip formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Total Spend']} />
 <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 )
}
