"use client"
import { useState, useEffect } from "react"
import { PurchasingAPI, InventoryAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Plus, X, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CreateOrderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])

  const [form, setForm] = useState({
    partnerId: "",
    warehouseId: "",
    orderDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    expectedReceipt: "",
    notes: "",
    paymentTerms: ""
  })

  const [items, setItems] = useState([
    { productId: "", qty: 1, price: 0, taxRate: 0, discount: 0 }
  ])

  useEffect(() => {
    Promise.all([
      PurchasingAPI.getSuppliers().catch(() => []),
      InventoryAPI.getProducts().catch(() => []),
      InventoryAPI.getWarehouses().catch(() => [])
    ]).then(([sup, prod, wh]) => {
      setSuppliers(sup?.data || sup || [])
      setProducts(prod?.data || prod || [])
      setWarehouses(wh?.data || wh || [])
    })
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.partnerId) return toast({ title: "Pilih Supplier", variant: "destructive" })
    if (items.length === 0) return toast({ title: "Tambah minimal 1 item", variant: "destructive" })
    
    setLoading(true)
    try {
      const payload = {
        ...form,
        orderDate: new Date(form.orderDate),
        expectedReceipt: form.expectedReceipt ? new Date(form.expectedReceipt) : null,
        items: items.map(i => ({
          productId: i.productId,
          qty: Number(i.qty),
          price: Number(i.price),
          taxRate: Number(i.taxRate) / 100,
          discount: Number(i.discount)
        }))
      }
      // Trick: Create an RFQ and immediately confirm it to bypass needing a separate backend Create PO endpoint
      const res = await PurchasingAPI.createRFQ(payload)
      const poId = res?.data?.id || res?.id
      if (poId) {
        await PurchasingAPI.confirmRFQ(poId)
      }
      toast({ title: "Purchase Order Berhasil dibuat" })
      router.push("/purchasing/orders")
    } catch(err) {
      toast({ title: "Gagal membuat Order", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/purchasing/orders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Purchase Order (PO)</h1>
          <p className="text-muted-foreground text-sm">Pesanan Pembelian Langsung ke Supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="overflow-visible">
          <CardHeader><CardTitle>Data Utama</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={form.partnerId} onValueChange={(v: any) => setForm({...form, partnerId: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih Supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warehouse Tujuan</Label>
              <Select value={form.warehouseId} onValueChange={(v: any) => setForm({...form, warehouseId: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih Gudang" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Order</Label>
              <Input type="date" value={form.orderDate} onChange={e => setForm({...form, orderDate: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Ekspektasi Kedatangan</Label>
              <Input type="date" value={form.expectedReceipt} onChange={e => setForm({...form, expectedReceipt: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Termin Pembayaran</Label>
              <Input value={form.paymentTerms} onChange={e => setForm({...form, paymentTerms: e.target.value})} placeholder="Contoh: Net 30, Cash, dll" />
            </div>
            <div className="space-y-2">
              <Label>Catatan Tambahan</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Catatan opsional..." />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rincian Barang</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", qty: 1, price: 0, taxRate: 0, discount: 0 }])}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Barang
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                <div className="col-span-4 space-y-2">
                  <Label className="text-xs">Barang</Label>
                  <Select value={item.productId} onValueChange={(v: any) => {
                    const newItems = [...items]; newItems[index].productId = v; setItems(newItems);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min="1" value={item.qty} onChange={e => {
                    const newItems = [...items]; newItems[index].qty = e.target.value as any; setItems(newItems);
                  }} />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label className="text-xs">Harga Satuan (Rp)</Label>
                  <Input type="number" value={item.price} onChange={e => {
                    const newItems = [...items]; newItems[index].price = e.target.value as any; setItems(newItems);
                  }} />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label className="text-xs">Pajak (%)</Label>
                  <Input type="number" max="100" value={item.taxRate} onChange={e => {
                    const newItems = [...items]; newItems[index].taxRate = e.target.value as any; setItems(newItems);
                  }} />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label className="text-xs">Diskon</Label>
                  <Input type="number" value={item.discount} onChange={e => {
                    const newItems = [...items]; newItems[index].discount = e.target.value as any; setItems(newItems);
                  }} />
                </div>
                <div className="col-span-1 pb-1">
                  <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => setItems((Array.isArray(items) ? items : []).filter((_, i) => i !== index))}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Belum ada barang ditambahkan.</p>}
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Menyimpan..." : "Buat Purchase Order"}
        </Button>
      </form>
    </div>
  )
}

