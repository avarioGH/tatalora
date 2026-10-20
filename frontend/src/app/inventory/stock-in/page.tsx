"use client"

import { useState, useEffect } from"react"
import { useRouter } from"next/navigation"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Save, PackagePlus, AlertCircle, CheckCircle2, Plus, Trash2 } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function StockInPage() {
 const router = useRouter()
 const [loading, setLoading] = useState(false)
 const [success, setSuccess] = useState(false)
 const [error, setError] = useState("")

 const [warehouses, setWarehouses] = useState<any[]>([])
 const [products, setProducts] = useState<any[]>([])

 const [formData, setFormData] = useState({
 warehouseId:"",
 notes:"",
 items: [
 { productId:"", qty: 1, unitCost: 0, notes:"" }
 ]
 })

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 const [whRes, prdRes] = await Promise.all([
 api.get('/inventory/warehouses'),
 api.get('/inventory/products')
 ])
 setWarehouses(whRes.data)
 setProducts(prdRes.data)
 
 // Auto select first warehouse if available and no user-specific active warehouse
 if (whRes.data.length > 0) {
 const storedActive = localStorage.getItem("active_warehouse")
 if (storedActive && storedActive !=="undefined" && storedActive !=="null") {
 try {
 const parsed = JSON.parse(storedActive)
 if (parsed && parsed.id && whRes.data.some((w: any) => w.id === parsed.id)) {
 setFormData(prev => ({ ...prev, warehouseId: parsed.id }))
 return
 }
 } catch (e) {
 console.error(e)
 }
 }
 setFormData(prev => ({ ...prev, warehouseId: whRes.data[0].id }))
 }
 } catch (err) {
 console.error("Gagal mengambil data referensi", err)
 }
 }

 const addItem = () => {
 setFormData(prev => ({
 ...prev,
 items: [...prev.items, { productId:"", qty: 1, unitCost: 0, notes:"" }]
 }))
 }

 const removeItem = (index: number) => {
 if (formData.items.length <= 1) return
 setFormData(prev => {
 const newItems = [...prev.items]
 newItems.splice(index, 1)
 return { ...prev, items: newItems }
 })
 }

 const updateItem = (index: number, field: string, value: any) => {
 setFormData(prev => {
 const newItems = [...prev.items]
 newItems[index] = { ...newItems[index], [field]: value }
 
 // Auto fill unit cost if product is selected
 if (field === 'productId') {
 const product = products.find(p => p.id === value)
 if (product && product.purchase_price) {
 newItems[index].unitCost = Number(product.purchase_price)
 }
 }
 
 return { ...prev, items: newItems }
 })
 }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setLoading(true)
 setError("")
 
 // Validate
 if (!formData.warehouseId) {
 setError("Pilih gudang tujuan")
 setLoading(false)
 return
 }
 
 const invalidItems = formData.items.filter(i => !i.productId || i.qty <= 0)
 if (invalidItems.length > 0) {
 setError("Pastikan semua item memiliki produk dan kuantitas lebih dari 0")
 setLoading(false)
 return
 }

 try {
 await api.post('/inventory/inbound', formData)
 setSuccess(true)
 setTimeout(() => {
 router.push('/inventory')
 }, 2000)
 } catch (err: any) {
 console.error(err)
 setError((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal menyimpan transaksi inbound.")
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
 <div className="flex items-center gap-4">
 <Link href="/inventory">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Stok Masuk</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Catat penerimaan barang dari supplier atau sumber lainnya.</p>
 </div>
 </div>

 <Card className="border-border shadow-sm overflow-hidden">
 <div className="h-2 w-full bg-blue-500"></div>
 <form onSubmit={handleSubmit}>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <PackagePlus className="w-5 h-5 text-blue-500" /> Detail Transaksi Masuk
 </CardTitle>
 <CardDescription>Pilih gudang penerima dan rincian barang yang masuk.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 
 {success && (
 <div className="bg-emerald-50 dark:bg-emerald-900/30 text-primary dark:text-primary p-4 rounded-lg flex items-center gap-3 border border-emerald-200 dark:border-emerald-800">
 <CheckCircle2 className="w-5 h-5" />
 <p className="font-medium text-sm">Transaksi berhasil disimpan! Mengalihkan ke halaman inventaris...</p>
 </div>
 )}
 
 {error && (
 <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-lg flex items-center gap-3 border border-rose-200 dark:border-rose-800">
 <AlertCircle className="w-5 h-5 flex-shrink-0" />
 <p className="font-medium text-sm">{error}</p>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label>Gudang Penerima</Label>
 <Select value={formData.warehouseId} onValueChange={(val) => setFormData({...formData, warehouseId: val as string})}>
 <SelectTrigger className="bg-card border-border dark:border-border">
 <SelectValue placeholder="Pilih Gudang">
 {warehouses.find(w => w.id === formData.warehouseId)?.name ||"Pilih Gudang"}
 </SelectValue>
 </SelectTrigger>
 <SelectContent>
 {warehouses.length > 0 ? (
 warehouses.map(wh => (
 <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
 ))
 ) : (
 <SelectItem value="empty" disabled>Belum ada gudang</SelectItem>
 )}
 </SelectContent>
 </Select>
 </div>
 
 <div className="space-y-2">
 <Label>Catatan (Opsional)</Label>
 <Input 
 placeholder="Misal: PO-2023-1001" 
 value={formData.notes}
 onChange={(e) => setFormData({...formData, notes: e.target.value})}
 className="bg-card border-border dark:border-border"
 />
 </div>
 </div>

 <div className="space-y-4 pt-4 border-t border-border">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 <Label className="text-base font-semibold">Daftar Barang Masuk</Label>
 <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
 <Plus className="w-4 h-4" /> Tambah Baris
 </Button>
 </div>

 <div className="space-y-3">
 {formData.items.map((item, index) => (
 <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-muted/40 p-4 rounded-lg border border-border relative">
 {formData.items.length > 1 && (
 <button type="button" onClick={() => removeItem(index)} className="absolute -top-2 -right-2 bg-card text-rose-500 border border-border rounded-full p-1.5 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 
 <div className="space-y-2 flex-1 w-full">
 <Label className="text-xs">Produk</Label>
 <Select value={item.productId} onValueChange={(val) => updateItem(index, 'productId', val as string)}>
 <SelectTrigger className="bg-card border-border dark:border-border">
 <SelectValue placeholder="Pilih Produk">
 {products.find(p => p.id === item.productId)?.name ||"Pilih Produk"}
 </SelectValue>
 </SelectTrigger>
 <SelectContent>
 {products.map(p => (
 <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2 w-full sm:w-24">
 <Label className="text-xs">Kuantitas</Label>
 <Input 
 type="number" min="1"
 value={item.qty}
 onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
 className="bg-card border-border dark:border-border"
 />
 </div>

 <div className="space-y-2 w-full sm:w-32">
 <Label className="text-xs">Harga Satuan (Rp)</Label>
 <Input 
 type="number" min="0"
 value={item.unitCost}
 onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
 className="bg-card border-border dark:border-border"
 />
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-6 border-t border-border">
 <Link href="/inventory">
 <Button type="button" variant="outline">Batal</Button>
 </Link>
 <Button type="submit" disabled={loading} className="min-w-[140px]">
 {loading ?"Memproses..." : (
 <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Simpan Stok Masuk</span>
 )}
 </Button>
 </div>
 </CardContent>
 </form>
 </Card>
 </div>
 )
}
