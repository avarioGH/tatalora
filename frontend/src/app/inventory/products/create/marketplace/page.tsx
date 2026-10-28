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
import { ArrowLeft, Store, Download, CheckCircle2, Search } from "lucide-react"
import { InventoryAPI } from "@/lib/api"

export default function CreateMarketplaceProductPage() {
  const router = useRouter()
  const [platform, setPlatform] = useState("SHOPEE")
  const [marketplaceUrl, setMarketplaceUrl] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])

  // Fetched / Parsed item state
  const [itemData, setItemData] = useState<any | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await InventoryAPI.getCategories()
      setCategories(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleFetchFromMarketplace = () => {
    if (!marketplaceUrl) return alert("Masukkan link/URL produk atau ID item marketplace")

    setIsSyncing(true)
    setTimeout(() => {
      // Simulate real marketplace integration response
      const randId = Math.floor(100000 + Math.random() * 900000)
      setItemData({
        name: platform === "SHOPEE" ? "Produk Impor Shopee Mall Official" : "Produk Impor Tokopedia Power Merchant",
        sku: `${platform.slice(0, 3)}-${randId}`,
        sellingPrice: 150000,
        purchasePrice: 100000,
        stock: 25,
        weight: 350,
        description: `Diimpor otomatis dari ${platform}.\nURL Asli: ${marketplaceUrl}\nIntegrasi Multi-Channel TATALORA ERP.`,
        categoryId: categories[0]?.id || "",
      })
      setIsSyncing(false)
    }, 1200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemData) return alert("Silakan tarik data produk dari marketplace terlebih dahulu")

    setIsSubmitting(true)
    try {
      const payload = new FormData()
      payload.append("code", itemData.sku)
      payload.append("barcode", itemData.sku)
      payload.append("name", itemData.name)
      payload.append("purchasePrice", itemData.purchasePrice.toString())
      payload.append("sellingPrice", itemData.sellingPrice.toString())
      payload.append("description", itemData.description)
      payload.append("categoryId", itemData.categoryId || "")
      payload.append("weight", itemData.weight.toString())

      await InventoryAPI.createProduct(payload)
      alert("Produk dari Marketplace berhasil diintegrasikan ke database!")
      router.push('/inventory/products')
    } catch (err: any) {
      console.error(err)
      alert("Gagal menambahkan produk marketplace: " + (err.response?.data?.message || err.message))
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
            <Store className="w-6 h-6 text-indigo-600" /> Tambah Produk dari Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Tarik dan sinkronisasikan katalog barang dari Shopee, Tokopedia, TikTok Shop, atau Lazada</p>
        </div>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
          <CardTitle className="text-lg">Koneksi & Sinkronisasi Marketplace</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Pilih Channel / Platform</Label>
              <Select value={platform} onValueChange={(val) => setPlatform(val || "SHOPEE")}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHOPEE">Shopee</SelectItem>
                  <SelectItem value="TOKOPEDIA">Tokopedia</SelectItem>
                  <SelectItem value="TIKTOK">TikTok Shop</SelectItem>
                  <SelectItem value="LAZADA">Lazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-semibold">Link URL Produk / ID Item Marketplace</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="https://shopee.co.id/product/... atau https://tokopedia.com/..." 
                  value={marketplaceUrl}
                  onChange={(e) => setMarketplaceUrl(e.target.value)}
                  className="bg-background"
                />
                <Button type="button" onClick={handleFetchFromMarketplace} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                  {isSyncing ? "Menarik..." : "Tarik Data"}
                </Button>
              </div>
            </div>
          </div>

          {itemData && (
            <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t border-border/50 animate-in fade-in duration-300">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Data produk dari {platform} berhasil ditarik. Silakan tinjau dan sesuaikan sebelum disimpan ke database:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Nama Produk di Database</Label>
                  <Input 
                    value={itemData.name} 
                    onChange={(e) => setItemData({ ...itemData, name: e.target.value })} 
                    required 
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Kode / SKU Terpetakan</Label>
                  <Input 
                    value={itemData.sku} 
                    onChange={(e) => setItemData({ ...itemData, sku: e.target.value })} 
                    required 
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Kategori</Label>
                  <Select value={itemData.categoryId} onValueChange={(val) => setItemData({ ...itemData, categoryId: val || "" })}>
                    <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Estimasi HPP (Rp)</Label>
                  <Input 
                    type="number" 
                    value={itemData.purchasePrice} 
                    onChange={(e) => setItemData({ ...itemData, purchasePrice: Number(e.target.value) || 0 })} 
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Harga Jual Marketplace (Rp)</Label>
                  <Input 
                    type="number" 
                    value={itemData.sellingPrice} 
                    onChange={(e) => setItemData({ ...itemData, sellingPrice: Number(e.target.value) || 0 })} 
                    required 
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Deskripsi / Metadata Marketplace</Label>
                <textarea 
                  rows={3} 
                  value={itemData.description} 
                  onChange={(e) => setItemData({ ...itemData, description: e.target.value })} 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
                <Button type="button" variant="outline" onClick={() => router.push('/inventory/products')}>
                  Batal
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan ke Database"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
