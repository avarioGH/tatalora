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
import { ArrowLeft, RefreshCcw, ArrowRightLeft } from "lucide-react"
import { InventoryAPI } from "@/lib/api"

export default function CreateConversionProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const [formData, setFormData] = useState({
    sourceProductId: "",
    name: "",
    code: "",
    conversionRatio: "12", // e.g. 1 Box = 12 Pcs
    fromUnit: "Box",
    toUnit: "Pcs",
    sellingPrice: "",
    categoryId: "",
    description: "",
  })

  useEffect(() => {
    loadData()
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

  const handleSourceProductChange = (prodId: string) => {
    const p = products.find(prod => prod.id === prodId)
    if (p) {
      const autoSKU = p.code + "-ECER"
      const ratio = Number(formData.conversionRatio) || 1
      const calculatedSelling = Math.round(Number(p.selling_price || 0) / ratio)

      setFormData(prev => ({
        ...prev,
        sourceProductId: prodId,
        name: p.name + " (Satuan Eceran)",
        code: autoSKU,
        sellingPrice: calculatedSelling.toString(),
        categoryId: p.category_id || "",
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.sourceProductId) return alert("Pilih produk asal untuk dikonversi")
    if (!formData.name) return alert("Nama produk hasil konversi wajib diisi")

    setIsSubmitting(true)
    try {
      const sourceProd = products.find(p => p.id === formData.sourceProductId)
      const ratio = Number(formData.conversionRatio) || 1
      const sourceHpp = Number(sourceProd?.purchase_price || 0)
      const unitHpp = Math.round(sourceHpp / ratio)

      const convDesc = `[PRODUK KONVERSI SATUAN]\nAsal Produk: ${sourceProd?.name} (${sourceProd?.code})\nRasio Konversi: 1 ${formData.fromUnit} = ${formData.conversionRatio} ${formData.toUnit}\nEstimasi HPP Per Unit: Rp ${unitHpp.toLocaleString('id-ID')}` +
        (formData.description ? `\n\nCatatan: ${formData.description}` : '')

      const payload = new FormData()
      payload.append("code", formData.code)
      payload.append("barcode", formData.code)
      payload.append("name", formData.name)
      payload.append("purchasePrice", unitHpp.toString())
      payload.append("sellingPrice", formData.sellingPrice || (unitHpp * 1.2).toString())
      payload.append("description", convDesc)
      payload.append("categoryId", formData.categoryId || "")

      await InventoryAPI.createProduct(payload)
      alert("Produk konversi satuan berhasil dibuat di database!")
      router.push('/inventory/products')
    } catch (err: any) {
      console.error(err)
      alert("Gagal menambahkan konversi: " + (err.response?.data?.message || err.message))
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
            <RefreshCcw className="w-6 h-6 text-indigo-600" /> Tambah Konversi Produk / Satuan
          </h1>
          <p className="text-sm text-muted-foreground">Pecah atau konversi produk dari satuan besar (Box/Karton) ke satuan kecil (Pcs/Eceran) atau sebaliknya</p>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <CardTitle className="text-lg">Aturan Konversi Produk</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex gap-1">Pilih Produk Sumber (Asal) <span className="text-rose-500">*</span></Label>
              <Select value={formData.sourceProductId} onValueChange={(val) => handleSourceProductChange(val || "")}>
                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pilih produk induk yang akan dikonversi..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code}) - Harga Jual: Rp {Number(p.selling_price || 0).toLocaleString('id-ID')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Konfigurasi Rasio */}
            <div className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Rasio Konversi Satuan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">1 Satuan Sumber</Label>
                  <Input 
                    value={formData.fromUnit} 
                    onChange={(e) => setFormData({ ...formData, fromUnit: e.target.value })} 
                    placeholder="Contoh: Box, Kardus, Sak" 
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1 text-center">
                  <Label className="text-xs text-muted-foreground">Menjadi Sebanyak</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-indigo-600">=</span>
                    <Input 
                      type="number" 
                      min="1" 
                      value={formData.conversionRatio} 
                      onChange={(e) => setFormData({ ...formData, conversionRatio: e.target.value })} 
                      className="bg-background text-center font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Satuan Hasil</Label>
                  <Input 
                    value={formData.toUnit} 
                    onChange={(e) => setFormData({ ...formData, toUnit: e.target.value })} 
                    placeholder="Contoh: Pcs, Sachet, Kg" 
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Detail Produk Baru Hasil Konversi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Nama Produk Hasil Konversi <span className="text-rose-500">*</span></Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">Kode / SKU Baru <span className="text-rose-500">*</span></Label>
                <Input 
                  value={formData.code} 
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                  required 
                  className="bg-background"
                />
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
                <Label className="text-xs font-semibold flex gap-1">Harga Jual Eceran Hasil Konversi (Rp) <span className="text-rose-500">*</span></Label>
                <Input 
                  type="number" 
                  value={formData.sellingPrice} 
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} 
                  required 
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Deskripsi / Catatan Konversi</Label>
              <Input 
                placeholder="Catatan aturan stock transformation..." 
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
                {isSubmitting ? "Menyimpan..." : "Simpan Produk Konversi"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
