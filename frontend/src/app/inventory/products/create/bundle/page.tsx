"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, PackageOpen, Plus, Trash2, HelpCircle } from "lucide-react"
import { InventoryAPI } from "@/lib/api"

export default function CreateBundleProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    categoryId: "",
    sellingPrice: "",
    description: "",
  })

  // List of bundle items
  const [bundleItems, setBundleItems] = useState<Array<{ productId: string; qty: number; unitPrice: number }>>([
    { productId: "", qty: 1, unitPrice: 0 }
  ])

  useEffect(() => {
    loadData()
    generateSKU()
  }, [])

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        InventoryAPI.getProducts().catch(() => []),
        InventoryAPI.getCategories().catch(() => [])
      ])
      setProducts(Array.isArray(prodRes) ? prodRes : [])
      setCategories(Array.isArray(catRes) ? catRes : [])
    } catch (err) {
      console.error(err)
    }
  }

  const generateSKU = () => {
    const randomCode = "BND-" + Math.floor(100000 + Math.random() * 900000)
    setFormData(prev => ({ ...prev, code: randomCode }))
  }

  const addItem = () => {
    setBundleItems(prev => [...prev, { productId: "", qty: 1, unitPrice: 0 }])
  }

  const removeItem = (idx: number) => {
    setBundleItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleProductSelect = (idx: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId)
    setBundleItems(prev => {
      const copy = [...prev]
      copy[idx].productId = prodId
      copy[idx].unitPrice = prod?.selling_price || 0
      return copy
    })
  }

  const handleQtyChange = (idx: number, qty: number) => {
    setBundleItems(prev => {
      const copy = [...prev]
      copy[idx].qty = qty
      return copy
    })
  }

  const totalCalculatedHPP = bundleItems.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId)
    return sum + ((prod?.purchase_price || 0) * (item.qty || 1))
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return alert("Nama produk paket wajib diisi")
    if (bundleItems.some(i => !i.productId)) return alert("Mohon pilih semua komponen isi paket")

    setIsSubmitting(true)
    try {
      const bundleDesc = `[PRODUK PAKET/BUNDLE]\nKomponen:\n` + 
        bundleItems.map(i => {
          const p = products.find(prod => prod.id === i.productId)
          return `- ${p?.name || i.productId} (${i.qty}x)`
        }).join('\n') + 
        (formData.description ? `\n\nCatatan: ${formData.description}` : '')

      const payload = new FormData()
      payload.append("code", formData.code)
      payload.append("barcode", formData.code)
      payload.append("name", formData.name)
      payload.append("purchasePrice", totalCalculatedHPP.toString())
      payload.append("sellingPrice", formData.sellingPrice || totalCalculatedHPP.toString())
      payload.append("description", bundleDesc)
      payload.append("categoryId", formData.categoryId || "")

      await InventoryAPI.createProduct(payload)
      alert("Produk Paket berhasil dibuat dan tersimpan ke database!")
      router.push('/inventory/products')
    } catch (err: any) {
      console.error(err)
      alert("Gagal menambahkan paket: " + (err.response?.data?.message || err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/inventory/products')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PackageOpen className="w-6 h-6 text-indigo-600" /> Tambah Produk Paket (Bundle)
          </h1>
          <p className="text-sm text-muted-foreground">Gabungkan beberapa produk menjadi 1 paket penawaran khusus</p>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <CardTitle className="text-lg">Informasi Paket</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Nama Paket <span className="text-rose-500">*</span></Label>
                <Input 
                  placeholder="Contoh: Paket Bundling Furnitur Ruang Tamu" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">Kode / SKU Paket <span className="text-rose-500">*</span></Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.code} 
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                    required 
                    className="bg-background"
                  />
                  <Button type="button" variant="outline" onClick={generateSKU}>Generate</Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Kategori</Label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData({ ...formData, categoryId: val || "" })}>
                  <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Harga Jual Paket (Rp) <span className="text-rose-500">*</span></Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={formData.sellingPrice} 
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} 
                  required 
                  className="bg-background"
                />
              </div>
            </div>

            {/* Komponen Item dalam Paket */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Komponen Produk dalam Paket</h3>
                  <p className="text-xs text-muted-foreground">Pilih produk individual yang termasuk ke dalam paket ini</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                  <Plus className="w-4 h-4" /> Tambah Komponen
                </Button>
              </div>

              <div className="space-y-3">
                {bundleItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/20 border border-border/60 rounded-lg">
                    <div className="flex-1">
                      <Select value={item.productId} onValueChange={(val) => handleProductSelect(idx, val || "")}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih Produk..." /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.code}) - Stok: {p.warehouse_stocks?.reduce((s: number, w: any) => s + w.current_stock, 0) || 0}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.qty} 
                        onChange={(e) => handleQtyChange(idx, Number(e.target.value) || 1)} 
                        placeholder="Qty" 
                        className="bg-background text-center"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(idx)} 
                      disabled={bundleItems.length === 1}
                      className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex justify-between items-center text-sm font-medium">
                <span className="text-indigo-900">Total Estimasi Biaya Pokok (HPP Komponen):</span>
                <span className="text-indigo-700 font-bold">
                  Rp {totalCalculatedHPP.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Deskripsi Paket</Label>
              <Input 
                placeholder="Deskripsi promo atau syarat paket..." 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="bg-background"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => router.push('/inventory/products')}>
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[130px]" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Paket"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
