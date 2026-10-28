"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Box, Upload, X, HelpCircle, Plus, ChevronRight, Check } from "lucide-react"
import { InventoryAPI } from "@/lib/api"

export default function CreateProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [formData, setFormData] = useState({
    code: "",
    barcode: "",
    name: "",
    description: "",
    purchasePrice: "0",
    sellingPrice: "",
    weight: "",
    categoryId: ""
  })
  const [weightUnit, setWeightUnit] = useState<'gr' | 'kg' | 'ons'>('gr')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => {
    loadCategories()
    generateSKU()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await InventoryAPI.getCategories()
      setCategories(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error(err)
    }
  }

  const generateSKU = () => {
    const randomCode = "PRD-" + Math.floor(100000 + Math.random() * 900000)
    setFormData(prev => ({ ...prev, code: randomCode, barcode: randomCode }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files)
      setImages(prev => [...prev, ...filesArr])
      const newPreviews = filesArr.map(f => URL.createObjectURL(f))
      setImagePreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      alert("Nama produk wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = new FormData()
      payload.append("code", formData.code)
      payload.append("barcode", formData.barcode)
      payload.append("name", formData.name)
      payload.append("purchasePrice", formData.purchasePrice || "0")
      payload.append("sellingPrice", formData.sellingPrice || "0")
      payload.append("description", formData.description || "")
      payload.append("categoryId", formData.categoryId || "")

      let weightInGrams = 0
      if (formData.weight) {
        const val = Number(formData.weight)
        if (weightUnit === 'gr') weightInGrams = val
        if (weightUnit === 'kg') weightInGrams = val * 1000
        if (weightUnit === 'ons') weightInGrams = val * 100
      }
      payload.append("weight", weightInGrams.toString())

      images.forEach((img) => {
        payload.append("images", img)
      })

      await InventoryAPI.createProduct(payload)
      alert("Produk berhasil ditambahkan ke database!")
      router.push('/inventory/products')
    } catch (err: any) {
      console.error(err)
      alert("Gagal menambahkan produk: " + (err.response?.data?.message || err.message))
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
            <Box className="w-6 h-6 text-indigo-600" /> Tambah Produk Standar
          </h1>
          <p className="text-sm text-muted-foreground">Tambahkan barang / produk tunggal standar ke inventori database</p>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-border/50 pb-4 flex flex-row justify-between items-center bg-muted/10">
            <CardTitle className="text-lg">Informasi Umum Produk</CardTitle>
            <Button variant="outline" size="sm" type="button" className="bg-background gap-2">
              <HelpCircle className="w-4 h-4"/> Panduan
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            
            {/* Foto Produk */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Foto Produk</Label>
              <div className="flex flex-wrap gap-4 items-center">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg border border-border overflow-hidden group">
                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(idx)} 
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-indigo-500 cursor-pointer flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-indigo-600 transition-colors">
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-medium">Upload</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Nama Produk & SKU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Nama Produk <span className="text-rose-500">*</span></Label>
                <Input 
                  placeholder="Contoh: Meja Kayu Jati Premium" 
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
                    placeholder="PRD-00001" 
                    value={formData.code} 
                    onChange={(e) => setFormData({ ...formData, code: e.target.value, barcode: e.target.value })} 
                    required
                    className="bg-background"
                  />
                  <Button type="button" variant="outline" onClick={generateSKU}>Generate</Button>
                </div>
              </div>
            </div>

            {/* Kategori & Satuan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Kategori <span className="text-rose-500">*</span></Label>
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
                <Label className="text-xs font-semibold flex gap-1">Satuan Dasar <span className="text-rose-500">*</span></Label>
                <Select defaultValue="pcs">
                  <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pcs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pcs</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Berat & Dimensi */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Berat</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={formData.weight} 
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })} 
                    className="bg-background"
                  />
                  <Select value={weightUnit} onValueChange={(val: any) => setWeightUnit(val)}>
                    <SelectTrigger className="w-20 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gr">gr</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ons">ons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Panjang (cm)</Label>
                <Input type="number" placeholder="0" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Lebar (cm)</Label>
                <Input type="number" placeholder="0" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tinggi (cm)</Label>
                <Input type="number" placeholder="0" className="bg-background" />
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Deskripsi Produk</Label>
              <Input 
                placeholder="Spesifikasi, keunggulan, atau catatan produk..." 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="bg-background"
              />
            </div>

            {/* Harga Beli & Harga Jual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Harga Beli / Pokok (HPP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">Rp</span>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={formData.purchasePrice} 
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} 
                    className="bg-background pl-10" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Harga Jual Satuan <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">Rp</span>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={formData.sellingPrice} 
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} 
                    required 
                    className="bg-background pl-10" 
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => router.push('/inventory/products')}>
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[130px]" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
              </Button>
            </div>

          </CardContent>
        </form>
      </Card>
    </div>
  )
}
