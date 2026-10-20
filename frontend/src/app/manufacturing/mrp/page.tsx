"use client"
import { useState, useEffect } from 'react'
import { api, InventoryAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Loader2, Calculator, AlertTriangle, ArrowRight, Cog, TrendingDown } from 'lucide-react'
import { useToast } from"@/hooks/use-toast"

export default function MRPPage() {
 const { toast } = useToast()
 const [data, setData] = useState<any[]>([])
 const [warehouses, setWarehouses] = useState<any[]>([])
 const [selectedWarehouse, setSelectedWarehouse] = useState<string>("")
 const [loading, setLoading] = useState(false)

 useEffect(() => {
 InventoryAPI.getWarehouses().then((res: any) => {
 if (Array.isArray(res)) setWarehouses(res)
 }).catch(console.error)
 }, [])

 const runMRP = async () => {
 setLoading(true)
 try {
 const endpoint = selectedWarehouse && selectedWarehouse !== 'all' 
 ? `/mrp/calculate?warehouse_id=${selectedWarehouse}`
 : '/mrp/calculate'
 const res = await api.get(endpoint)
 setData(Array.isArray(res.data?.recommendations) ? res.data.recommendations : (Array.isArray(res.data) ? res.data : []))
 toast({ title:"MRP Calculated", description:"Material requirements have been computed." })
 } catch (err: any) {
 toast({ title:"Error", description: (err.response?.data?.error?.message || err.response?.data?.message) ||"Failed to calculate MRP.", variant:"destructive" })
 } finally {
 setLoading(false)
 }
 }

 const getActionBadge = (action: string) => {
 switch (action) {
 case 'MANUFACTURE': return <Badge className="bg-amber-500">Manufacture</Badge>
 case 'PURCHASE': return <Badge className="bg-blue-500">Purchase</Badge>
 case 'TRANSFER': return <Badge className="bg-indigo-500">Transfer</Badge>
 case 'COVERED': return <Badge className="bg-emerald-500">Covered</Badge>
 default: return <Badge variant="outline">{action}</Badge>
 }
 }

 return (
 <div className="space-y-6 pb-10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Material Requirements Planning</h1>
 <p className="text-muted-foreground mt-1">Calculate stock shortages and generate production or purchase recommendations.</p>
 </div>
 </div>

 <Card className="shadow-sm border-indigo-100">
 <CardHeader className="bg-indigo-50/50 border-b pb-4">
 <CardTitle className="text-lg flex items-center gap-2 text-indigo-800"><Calculator className="w-5 h-5" /> Run MRP Engine</CardTitle>
 <CardDescription>Select a scope to calculate demand vs supply</CardDescription>
 </CardHeader>
 <CardContent className="pt-6 flex flex-col sm:flex-row gap-4 items-end">
 <div className="w-full sm:w-1/3 space-y-2">
 <label className="text-sm font-medium">Warehouse Scope</label>
 <Select value={selectedWarehouse} onValueChange={(val) => setSelectedWarehouse(val ||"")}>
 <SelectTrigger>
 <SelectValue placeholder="All Warehouses (Global)" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Warehouses (Global)</SelectItem>
 {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <Button onClick={runMRP} disabled={loading} className=" w-full sm:w-auto">
 {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cog className="w-4 h-4 mr-2" />} Calculate Needs
 </Button>
 </CardContent>
 </Card>

 {data.length > 0 && (
 <Card className="shadow-sm">
 <CardHeader className="pb-4 border-b">
 <CardTitle className="text-[16px] font-semibold flex items-center gap-2"><TrendingDown className="w-5 h-5" /> Recommendations & Shortages</CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Product</th>
 <th className="p-4 px-6 text-right text-[#526174] font-semibold text-[13px] tracking-wide">Demand</th>
 <th className="p-4 px-6 text-right text-[#526174] font-semibold text-[13px] tracking-wide">Available</th>
 <th className="p-4 px-6 text-right text-[#526174] font-semibold text-[13px] tracking-wide">Shortage</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Recommendation</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Action</th>
 </tr>
 </thead>
 <tbody>
 {data.map((item, i) => (
 <tr key={i} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
 <td className="p-4 px-6 font-medium">{item.product_name || item.product_id || item.product?.name}</td>
 <td className="py-3.5 px-6 text-right text-[13px]">{item.demand || 0}</td>
 <td className="py-3.5 px-6 text-right text-[13px]">{item.available || item.on_hand || 0}</td>
 <td className="p-4 px-6 text-right font-bold text-red-600">{item.shortage > 0 ? item.shortage : 0}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">{getActionBadge(item.action || item.recommendation)}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">
 {(item.action === 'MANUFACTURE' || item.recommendation === 'MANUFACTURE') && (
 <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700">Create MO</Button>
 )}
 {(item.action === 'PURCHASE' || item.recommendation === 'PURCHASE') && (
 <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700">Create PR</Button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 )
}
