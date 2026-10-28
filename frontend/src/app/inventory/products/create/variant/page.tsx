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
import { ArrowLeft, LayoutGrid, Plus, Trash2 } from "lucide-react"
import { InventoryAPI } from "@/lib/api"

export default function CreateVariantProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    baseName: "",
    baseCode: "",
    categoryId: "",
    defaultPurchasePrice: "",
    defaultSellingPrice: "",
  })

  // List of variant options (e.g. Red-S, Red-M, Blue-S, etc.)
  const [variants, setVariants] = useState<Array<{
    sku: string;
    variantName: string;
    purchasePrice: string;
    sellingPrice: string;
    stock: number;
  }>>([
    { sku: "", variantName: "Merah / S", purchasePrice: "", sellingPrice: "", stock: 10 },
    { sku: "", variantName: "Merah / M", purchasePrice: "", sellingPrice: "", stock: 10 },
  ])

  useEffect(() => {
    loadCategories()
    const randomBase = "VAR-" + Math.floor(100000 + Math.random() * 900000)
    setFormData(prev => ({ ...prev, baseCode: randomBase }))
  }, [])

  const loadCategories = async () => {
    try {
      const res = await InventoryAPI.getCategories()
      setCategories(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error(err)
    }
  }

  const addVariantRow = () => {
    setVariants(prev => [
      ...prev,
      {
        sku: `${formData.baseCode}-${prev.length + 1}`,
        variantName: "",
        purchasePrice: formData.defaultPurchasePrice || "0",
        sellingPrice: formData.defaultSellingPrice || "0",
        stock: 0
      }
    ])
  }

  const removeVariantRow = (idx: number) => {
    setVariants(prev => prev.filter((_, i) => i !== idx))
  }

  const updateVariant = (idx: number, field: string, val: any) => {
    setVariants(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      return copy
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.baseName) return alert("Nama produk induk varian wajib diisi")
    if (variants.length === 0) return alert("Minimal buat 1 opsi varian")

    setIsSubmitting(true)
    try {
      // Create each variant as an inventory product in database linked by SKU prefix
      for (const [idx, v] of variants.entries()) {
        const sku = v.sku || `${formData.baseCode}-${idx + 1}`
        const fullName = `${formData.baseName} (${v.variantName || 'Varian ' + (idx + 1)})`
        const pPrice = v.purchasePrice || formData.defaultPurchasePrice || "0"
        const sPrice = v.sellingPrice || formData.defaultSellingPrice || "0"

        const payload = new FormData()
        payload.append("code", sku)
        payload.append("barcode", sku)
        payload.append("name", fullName)
        payload.append("purchasePrice", pPrice)
        payload.append("sellingPrice", sPrice)
        payload.append("description", `[PRODUK VARIAN]\nInduk: ${formData.baseName}\nVarian: ${v.variantName}\nInisial Stok: ${v.stock}`)
        payload.append("categoryId", formData.categoryId || "")

        await InventoryAPI.createProduct(payload)
      }

      alert(`${variants.length} Varian produk berhasil disimpan ke inventori database!`)
      router.push('/inventory/products')
    } catch (err: any) {
      console.error(err)
      alert("Gagal menambahkan produk varian: " + (err.response?.data?.message || err.message))
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
            <LayoutGrid className="w-6 h-6 text-indigo-600" /> Tambah Produk Varian
          </h1>
          <p className="text-sm text-muted-foreground">Buat produk dengan beragam opsi atribut seperti warna, ukuran, atau rasa</p>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
            <CardTitle className="text-lg">Informasi Induk Produk</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Nama Produk Induk <span className="text-rose-500">*</span></Label>
                <Input 
                  placeholder="Contoh: Kaos Polos Katun Combed 30s" 
                  value={formData.baseName} 
                  onChange={(e) => setFormData({ ...formData, baseName: e.target.value })} 
                  required 
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">Kode Dasar SKU <span className="text-rose-500">*</span></Label>
                <Input 
                  value={formData.baseCode} 
                  onChange={(e) => setFormData({ ...formData, baseCode: e.target.value })} 
                  required 
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label className="text-xs font-semibold">Default Harga Beli (Rp)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={formData.defaultPurchasePrice} 
                  onChange={(e) => setFormData({ ...formData, defaultPurchasePrice: e.target.value })} 
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Default Harga Jual (Rp)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={formData.defaultSellingPrice} 
                  onChange={(e) => setFormData({ ...formData, defaultSellingPrice: e.target.value })} 
                  className="bg-background"
                />
              </div>
            </div>

            {/* Tabel Opsi Varian */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Daftar Opsi Varian Produk</h3>
                  <p className="text-xs text-muted-foreground">Tentukan variasi warna, ukuran, SKU, harga, dan stok tiap opsi</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addVariantRow} className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                  <Plus className="w-4 h-4" /> Tambah Baris Varian
                </Button>
              </div>

              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row items-center gap-3 p-3 bg-muted/20 border border-border/60 rounded-lg">
                    <div className="w-full md:w-48">
                      <Label className="text-[11px] text-muted-foreground md:hidden mb-1 block">Opsi / Nama Varian</Label>
                      <Input 
                        placeholder="Contoh: Merah / XL" 
                        value={v.variantName} 
                        onChange={(e) => updateVariant(idx, "variantName", e.target.value)} 
                        className="bg-background text-sm"
                        required
                      />
                    </div>
                    <div className="w-full md:w-36">
                      <Label className="text-[11px] text-muted-foreground md:hidden mb-1 block">SKU</Label>
                      <Input 
                        placeholder={`${formData.baseCode}-${idx + 1}`} 
                        value={v.sku} 
                        onChange={(e) => updateVariant(idx, "sku", e.target.value)} 
                        className="bg-background text-sm"
                      />
                    </div>
                    <div className="w-full md:w-32">
                      <Label className="text-[11px] text-muted-foreground md:hidden mb-1 block">Harga Beli</Label>
                      <Input 
                        type="number" 
                        placeholder="HPP" 
                        value={v.purchasePrice} 
                        onChange={(e) => updateVariant(idx, "purchasePrice", e.target.value)} 
                        className="bg-background text-sm"
                      />
                    </div>
                    <div className="w-full md:w-32">
                      <Label className="text-[11px] text-muted-foreground md:hidden mb-1 block">Harga Jual</Label>
                      <Input 
                        type="number" 
                        placeholder="Jual" 
                        value={v.sellingPrice} 
                        onChange={(e) => updateVariant(idx, "sellingPrice", e.target.value)} 
                        className="bg-background text-sm"
                      />
                    </div>
                    <div className="w-full md:w-24">
                      <Label className="text-[11px] text-muted-foreground md:hidden mb-1 block">Stok Awal</Label>
                      <Input 
                        type="number" 
                        value={v.stock} 
                        onChange={(e) => updateVariant(idx, "stock", Number(e.target.value) || 0)} 
                        className="bg-background text-sm text-center"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeVariantRow(idx)} 
                      disabled={variants.length === 1}
                      className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => router.push('/inventory/products')}>
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[130px]" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Semua Varian"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
