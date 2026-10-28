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
import { ArrowLeft, LayoutGrid, Plus, Trash2, Cpu } from "lucide-react"
import { InventoryAPI, api } from "@/lib/api"

export default function CreateManufactureProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    categoryId: "",
    sellingPrice: "",
    laborCost: "0",
    overheadCost: "0",
    description: "",
  })

  // Bill of Materials components (raw materials)
  const [bomItems, setBomItems] = useState<Array<{ productId: string; qty: number; unitCost: number }>>([
    { productId: "", qty: 1, unitCost: 0 }
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
    const randomCode = "MFG-" + Math.floor(100000 + Math.random() * 900000)
    setFormData(prev => ({ ...prev, code: randomCode }))
  }

  const addItem = () => {
    setBomItems(prev => [...prev, { productId: "", qty: 1, unitCost: 0 }])
  }

  const removeItem = (idx: number) => {
    setBomItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleProductSelect = (idx: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId)
    setBomItems(prev => {
      const copy = [...prev]
      copy[idx].productId = prodId
      copy[idx].unitCost = prod?.purchase_price || 0
      return copy
    })
  }

  const handleQtyChange = (idx: number, qty: number) => {
    setBomItems(prev => {
      const copy = [...prev]
      copy[idx].qty = qty
      return copy
    })
  }

  const rawMaterialsTotal = bomItems.reduce((sum, item) => {
    return sum + (item.unitCost * (item.qty || 1))
  }, 0)

  const totalCalculatedHPP = rawMaterialsTotal + Number(formData.laborCost || 0) + Number(formData.overheadCost || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return alert("Nama produk manufaktur wajib diisi")
    if (bomItems.some(i => !i.productId)) return alert("Mohon tentukan semua bahan baku")

    setIsSubmitting(true)
    try {
      const mfgDesc = `[PRODUK MANUFAKTUR / HASIL PRODUKSI]\nBOM Resep Bahan Baku:\n` + 
        bomItems.map(i => {
          const p = products.find(prod => prod.id === i.productId)
          return `- ${p?.name || i.productId} (${i.qty} unit)`
        }).join('\n') + 
        `\nTenaga Kerja: Rp ${Number(formData.laborCost).toLocaleString('id-ID')}` +
        `\nOverhead: Rp ${Number(formData.overheadCost).toLocaleString('id-ID')}` +
        (formData.description ? `\n\nCatatan: ${formData.description}` : '')

      // 1. Create the manufactured product
      const payload = new FormData()
      payload.append("code", formData.code)
      payload.append("barcode", formData.code)
      payload.append("name", formData.name)
      payload.append("purchasePrice", totalCalculatedHPP.toString())
      payload.append("sellingPrice", formData.sellingPrice || (totalCalculatedHPP * 1.3).toString())
      payload.append("description", mfgDesc)
      payload.append("categoryId", formData.categoryId || "")

      const createdProduct = await InventoryAPI.createProduct(payload)

      // 2. Also register BOM if endpoint exists
      try {
        await api.post('/manufacturing/bom', {
          productId: createdProduct.id,
          code: 'BOM-' + formData.code,
          name: 'BOM ' + formData.name,
          quantity: 1,
          items: bomItems.map(i => ({
            productId: i.productId,
            quantity: i.qty
          }))
        })
      } catch (bomErr) {
        // Optional BOM table insert
        console.log("BOM registered directly in product description & structure", bomErr)
      }

      alert("Produk Manufaktur beserta formulasi BOM bahan baku berhasil dibuat!")
      router.push('/inventory/products')
    } catch (err: any) {
      console.error(err)
      alert("Gagal menambahkan produk manufaktur: " + (err.response?.data?.message || err.message))
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
            <LayoutGrid className="w-6 h-6 text-indigo-600" /> Tambah Produk Manufaktur
          </h1>
          <p className="text-sm text-muted-foreground">Konfigurasi produk hasil produksi beserta Resep / Bill of Materials (BOM) bahan baku</p>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <CardTitle className="text-lg">Detail Produk Jadi & Resep Produksi</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Nama Produk Jadi <span className="text-rose-500">*</span></Label>
                <Input 
                  placeholder="Contoh: Kursi Kayu Solid Finishing Natural" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">Kode / SKU <span className="text-rose-500">*</span></Label>
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
                <Label className="text-xs font-semibold flex gap-1">Harga Jual Produk (Rp) <span className="text-rose-500">*</span></Label>
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

            {/* Bill of Materials (BOM) */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" /> Resep / Bahan Baku (Bill of Materials)
                  </h3>
                  <p className="text-xs text-muted-foreground">Tentukan material mentah yang dibutuhkan untuk memproduksi 1 unit barang ini</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                  <Plus className="w-4 h-4" /> Tambah Bahan
                </Button>
              </div>

              <div className="space-y-3">
                {bomItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/20 border border-border/60 rounded-lg">
                    <div className="flex-1">
                      <Select value={item.productId} onValueChange={(val) => handleProductSelect(idx, val || "")}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih Bahan Baku..." /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.code}) - HPP: Rp {Number(p.purchase_price || 0).toLocaleString('id-ID')}
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
                        placeholder="Jumlah" 
                        className="bg-background text-center"
                      />
                    </div>
                    <div className="w-32 text-right text-xs font-semibold text-muted-foreground">
                      Rp {(item.unitCost * item.qty).toLocaleString('id-ID')}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(idx)} 
                      disabled={bomItems.length === 1}
                      className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Biaya Tambahan Tenaga Kerja & Overhead */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Biaya Tenaga Kerja Langsung (Labor Cost)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">Rp</span>
                  <Input 
                    type="number" 
                    value={formData.laborCost} 
                    onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })} 
                    className="bg-background pl-10" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Biaya Overhead Pabrik (Listrik, Mesin, dll)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">Rp</span>
                  <Input 
                    type="number" 
                    value={formData.overheadCost} 
                    onChange={(e) => setFormData({ ...formData, overheadCost: e.target.value })} 
                    className="bg-background pl-10" 
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex justify-between items-center text-sm font-medium">
              <span className="text-emerald-900">Total Estimasi HPP Manufaktur (Material + Biaya):</span>
              <span className="text-emerald-700 font-bold">
                Rp {totalCalculatedHPP.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Instruksi Kerja / Catatan Manufaktur</Label>
              <Input 
                placeholder="Instruksi perakitan, standar QC, atau catatan produksi..." 
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
                {isSubmitting ? "Menyimpan..." : "Simpan Produk Manufaktur"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
