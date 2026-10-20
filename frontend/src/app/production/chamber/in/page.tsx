"use client"
import { useState, useEffect } from"react"
import { TimberAPI, InventoryAPI } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Loader2, ArrowLeft, Save, ArrowRight } from"lucide-react"
import { useRouter } from"next/navigation"
import { useToast } from"@/hooks/use-toast"

export default function ChamberInPage() {
 const router = useRouter()
 const { toast } = useToast()
 const [warehouses, setWarehouses] = useState<any[]>([])
 const [stocks, setStocks] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [submitting, setSubmitting] = useState(false)

 const [form, setForm] = useState({ date: new Date().toISOString().substring(0,10), fromLocationId:"", toLocationId:"", notes:"Chamber IN Operation" })
 const [item, setItem] = useState({ timberVariantId:"", quantityPcs:"" })

 useEffect(() => {
 InventoryAPI.getWarehouses()
 .then((res: any) => setWarehouses(Array.isArray(res) ? res : []))
 .catch(console.error).finally(() => setLoading(false))
 }, [])

 // Fetch available stock for selected source warehouse
 useEffect(() => {
 if (form.fromLocationId) {
 TimberAPI.getTimberStock({ locationId: form.fromLocationId })
 .then((res: any) => setStocks(res.items || []))
 .catch(console.error)
 }
 }, [form.fromLocationId])

 const selectedStock = stocks.find(s => s.timberVariantId === item.timberVariantId)
 const qty = parseInt(item.quantityPcs) || 0

 const handleSubmit = async (e: any) => {
 e.preventDefault()
 if (!form.fromLocationId || !form.toLocationId) return toast({ title:"Error", description:"Select source and chamber locations", variant:"destructive" })
 if (!selectedStock) return toast({ title:"Error", description:"Select a valid SKU", variant:"destructive" })
 if (qty > selectedStock.currentPcs) return toast({ title:"Error", description:"Insufficient stock in yard", variant:"destructive" })
 
 setSubmitting(true)
 try {
 // Calculate proportional volume
 let volumeM3 = 0;
 if (selectedStock.currentPcs > 0) {
 const volRatio = qty / selectedStock.currentPcs;
 volumeM3 = selectedStock.currentVolumeM3 * volRatio;
 }
 
 await InventoryAPI.createTransfer({
 ...form,
 items: [{ timberVariantId: item.timberVariantId, quantityPcs: qty, volumeM3 }]
 })
 toast({ title:"Success", description:"Timber moved to chamber" })
 router.push('/production/chamber')
 } catch (error: any) {
 toast({ title:"Error", description: error.message, variant:"destructive" })
 } finally {
 setSubmitting(false)
 }
 }

 const normalWarehouses = warehouses.filter(w => !(w.code || "").startsWith('CH-'))
 const chambers = warehouses.filter(w => (w.code || "").startsWith('CH-'))

 return (
 <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
 <div className="flex items-center gap-4">
 <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
 <h1 className="text-2xl font-bold">Process Chamber IN</h1>
 </div>

 <Card>
 <form onSubmit={handleSubmit}>
 <CardHeader>
 <CardTitle>Transfer to Chamber</CardTitle>
 <CardDescription>Move timber from physical yard into drying chamber.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /> : (
 <>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-sm font-medium">Source Yard (From)</label>
 <Select value={form.fromLocationId} onValueChange={(v) => setForm({...form, fromLocationId: v || ''})}>
 <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
 <SelectContent>{normalWarehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name || w.code || w.id}</SelectItem>)}</SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Kiln Chamber (To)</label>
 <Select value={form.toLocationId} onValueChange={(v) => setForm({...form, toLocationId: v || ''})}>
 <SelectTrigger><SelectValue placeholder="Select Chamber" /></SelectTrigger>
 <SelectContent>{chambers.map(w => <SelectItem key={w.id} value={w.id}>{w.name || w.code || w.id}</SelectItem>)}</SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Timber Variant</label>
 <Select value={item.timberVariantId} onValueChange={(v) => setItem({...item, timberVariantId: v || ''})}>
 <SelectTrigger><SelectValue placeholder="Select Variant from Source Stock" /></SelectTrigger>
 <SelectContent>
 {(Array.isArray(stocks) ? stocks : []).filter(s => s.currentPcs > 0).length === 0 ? (
   <div className="p-4 text-center text-sm text-muted-foreground max-w-[300px] whitespace-normal">
     Stok kosong di lokasi ini. <br/>
     Data Variant hanya muncul jika ada fisik stoknya. <br/>
     <a href="/inventory/adjustments/create" className="text-primary hover:underline font-medium mt-2 inline-block">
       + Tambah Stok Awal (Adjustment)
     </a>
   </div>
 ) : (
   (Array.isArray(stocks) ? stocks : []).filter(s => s.currentPcs > 0).map(s => (
     <SelectItem key={s.timberVariantId} value={s.timberVariantId}>
       {s.timberVariant?.name || s.timberVariant?.sku} (Avail: {s.currentPcs} PCS)
     </SelectItem>
   ))
 )}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Quantity (PCS)</label>
 <Input type="number" min="1" max={selectedStock?.currentPcs || 1} required 
 value={item.quantityPcs} onChange={(e) => setItem({...item, quantityPcs: e.target.value})} />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Notes</label>
 <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
 </div>

 <Button type="submit" disabled={submitting || !form.fromLocationId || !form.toLocationId || !item.timberVariantId} className="w-full">
 {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
 Confirm Chamber IN
 </Button>
 </>
 )}
 </CardContent>
 </form>
 </Card>
 <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-lg flex items-start gap-3 mt-6">
 <div className="text-blue-500 mt-0.5">â„¹ï¸</div>
 <div>
 <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Traceability Notice</h4>
 <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
 Chamber movement tracks timber by variant and quantity. Physical bundle-level traceability is not currently maintained in the inventory ledger.
 </p>
 </div>
 </div>
 </div>
 )
}

