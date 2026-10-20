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
import { ArrowLeft, Save, PackageMinus, AlertCircle, CheckCircle2, Plus, Trash2 } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function StockOutPage() {
 const router = useRouter()
 const [loading, setLoading] = useState(false)
 const [success, setSuccess] = useState(false)
 const [error, setError] = useState("")

 const [warehouses, setWarehouses] = useState<any[]>([])
 const [products, setProducts] = useState<any[]>([])
 const [warehouseStocks, setWarehouseStocks] = useState<any[]>([])

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
 const [whRes, prdRes, stockRes] = await Promise.all([
 api.get('/inventory/warehouses'),
 api.get('/inventory/products'),
 api.get('/inventory/stocks')
 ])
 setWarehouses(whRes.data)
 setProducts(prdRes.data)
 setWarehouseStocks(stockRes.data)
 
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

 const getAvailableStock = (productId: string) => {
 if (!formData.warehouseId || !productId) return 0
 const stock = warehouseStocks.find(s => s.warehouse_id === formData.warehouseId && s.product_id === productId)
 return stock ? stock.available_stock : 0
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
 setError("Pilih gudang asal")
 setLoading(false)
 return
 }
 
 const invalidItems = formData.items.filter(i => !i.productId || i.qty <= 0)
 if (invalidItems.length > 0) {
 setError("Pastikan semua item memiliki produk dan kuantitas lebih dari 0")
 setLoading(false)
 return
 }

 // Validate Stock
 for (const item of formData.items) {
 const available = getAvailableStock(item.productId)
 if (item.qty > available) {
 const prod = products.find(p => p.id === item.productId)
 setError(`Stok tidak mencukupi untuk produk ${prod?.name}. Tersedia: ${available}`)
 setLoading(false)
 return
 }
 }

 try {
 await api.post('/inventory/outbound', formData)
 setSuccess(true)
 setTimeout(() => {
 router.push('/inventory')
 }, 2000)
 } catch (err: any) {
 console.error(err)
 setError((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal menyimpan transaksi outbound.")
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
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Stok Keluar</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Catat pengeluaran barang untuk operasional, produksi, atau retur.</p>
 </div>
 </div>

 <Card className="border-border shadow-sm overflow-hidden group hover:border-amber-500 transition-colors">
 <div className="h-2 w-full bg-amber-500"></div>
 <form onSubmit={handleSubmit}>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <PackageMinus className="w-5 h-5 text-amber-500" /> Detail Transaksi Keluar
 </CardTitle>
 <CardDescription>Pilih gudang asal dan rincian barang yang keluar.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 
 {success && (
 <div className="bg-emerald-50 dark:bg-emerald-900/30 text-primary dark:text-primary p-4 rounded-lg flex items-center gap-3 border border-emerald-200 dark:border-emerald-800">
 <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
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
 <Label>Gudang Asal</Label>
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
 <Label>Catatan / Alasan Keluar</Label>
 <Input 
 placeholder="Misal: Pemakaian internal" 
 value={formData.notes}
 onChange={(e) => setFormData({...formData, notes: e.target.value})}
 className="bg-card border-border dark:border-border"
 />
 </div>
 </div>

 <div className="space-y-4 pt-4 border-t border-border">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 <Label className="text-base font-semibold">Daftar Barang Keluar</Label>
 <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
 <Plus className="w-4 h-4" /> Tambah Baris
 </Button>
 </div>

 <div className="space-y-3">
 {formData.items.map((item, index) => (
 <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-muted/40 p-4 rounded-lg border border-border relative">
 {formData.items.length > 1 && (
 <button type="button" onClick={() => removeItem(index)} className="absolute -top-2 -right-2 bg-card text-rose-500 border border-border rounded-full p-1.5 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm z-10">
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
 {products.map(p => {
 const avail = getAvailableStock(p.id)
 return (
 <SelectItem key={p.id} value={p.id} disabled={avail <= 0}>
 <div className="flex justify-between items-center w-full">
 <span>{p.name}</span>
 <span className="text-xs text-muted-foreground ml-2">(Stok: {avail})</span>
 </div>
 </SelectItem>
 )
 })}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2 w-full sm:w-24">
 <Label className="text-xs">Kuantitas</Label>
 <Input 
 type="number" min="1" max={getAvailableStock(item.productId)}
 value={item.qty}
 onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
 className={`bg-card border-border dark:border-border ${item.qty > getAvailableStock(item.productId) ? 'border-rose-500 text-rose-500' : ''}`}
 />
 </div>

 <div className="space-y-2 w-full sm:w-32">
 <Label className="text-xs">Harga Cost (Rp)</Label>
 <Input 
 type="number" min="0" disabled
 value={item.unitCost}
 onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
 className="bg-muted border-border text-muted-foreground cursor-not-allowed"
 title="Harga pokok otomatis dari sistem"
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
 <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]">
 {loading ?"Memproses..." : (
 <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Simpan Stok Keluar</span>
 )}
 </Button>
 </div>
 </CardContent>
 </form>
 </Card>
 </div>
 )
}
