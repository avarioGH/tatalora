"use client"
import { useState, useEffect } from "react"
import { InventoryAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Box } from "lucide-react"

export default function InitialStockPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [form, setForm] = useState({
    warehouse_id: "",
    tally_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    notes: "Input Stok Awal"
  })

  // Store quantities as an object mapped by product id
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    Promise.all([
      InventoryAPI.getWarehouses().catch(() => []),
      InventoryAPI.getProducts().catch(() => [])
    ]).then(([wh, prod]) => {
      const whData = wh?.data || wh || []
      const prodData = prod?.data || prod || []
      setWarehouses(whData)
      setProducts(prodData)
      
      if (whData.length > 0) {
        setForm(prev => ({ ...prev, warehouse_id: whData[0].id }))
      }
    }).finally(() => {
      setFetching(false)
    })
  }, [])

  const handleQtyChange = (productId: string, value: string) => {
    const num = parseInt(value)
    setQuantities(prev => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : num
    }))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.warehouse_id) return toast({ title: "Pilih Gudang", variant: "destructive" })
    
    const itemsToSubmit = products
      .filter(p => quantities[p.id] && quantities[p.id] > 0)
      .map(p => ({ product_id: p.id, qty: quantities[p.id] }))
      
    if (itemsToSubmit.length === 0) return toast({ title: "Masukkan jumlah setidaknya pada 1 produk", variant: "destructive" })
    
    setLoading(true)
    try {
      await InventoryAPI.createStockInTally({
        ...form,
        items: itemsToSubmit,
        idempotency_key: "initial_stock_" + Date.now()
      })
      toast({ title: "Berhasil memasukkan stok awal" })
      router.push("/inventory/stock")
    } catch(err: any) {
      toast({ title: "Gagal mencatat", description: err?.response?.data?.message || err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Input Stok Awal</h1>
          <p className="text-muted-foreground text-sm">Masukkan stok untuk semua produk ikan Anda dengan cepat.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Lokasi</CardTitle>
            <CardDescription>Pilih gudang tempat stok ini akan disimpan</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Lokasi Gudang</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={form.warehouse_id}
                onChange={e => setForm({...form, warehouse_id: e.target.value})}
                required
              >
                <option value="">Pilih Gudang...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={form.tally_date} onChange={e => setForm({...form, tally_date: e.target.value})} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Produk Ikan</CardTitle>
            <CardDescription>Isi jumlah stok pada produk yang Anda miliki saat ini. Kosongkan jika tidak ada stok.</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="p-8 text-center text-muted-foreground">Memuat daftar produk...</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center border border-dashed rounded-lg">
                <Box className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">Anda belum memiliki Produk Ikan.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/inventory/products')}>Buat Produk Dulu</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kode</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama Produk</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kategori</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground w-40">Qty Awal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{p.code || '-'}</td>
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3">{p.category?.name || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            className="w-24 text-right ml-auto"
                            value={quantities[p.id] || ""}
                            onChange={(e) => handleQtyChange(p.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading || products.length === 0} className="w-full sm:w-auto shadow-sm" size="lg">
            {loading ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2" /> Simpan Stok Awal</>}
          </Button>
        </div>
      </form>
    </div>
  )
}
