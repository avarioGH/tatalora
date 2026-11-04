"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, Box, Upload, X, HelpCircle, Plus, ChevronRight, Check, Sparkles, AlertCircle, Loader2 
} from "lucide-react"
import { InventoryAPI, api } from "@/lib/api"

export default function CreateProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loadingMaster, setLoadingMaster] = useState(false)

  // 1. Informasi Umum Produk
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    barcode: "",
    categoryId: "",
    unitName: "pcs",
    unitId: "",
    description: "",
  })

  // Dimensi & Berat
  const [weight, setWeight] = useState("")
  const [weightUnit, setWeightUnit] = useState<"gr" | "kg" | "ons">("gr")
  const [length, setLength] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")

  // Images
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // Jurnal Standard Modules
  const [iBuyThis, setIBuyThis] = useState(true)
  const [purchasePrice, setPurchasePrice] = useState("0")
  const [purchaseAccountId, setPurchaseAccountId] = useState("")
  const [purchaseTax, setPurchaseTax] = useState("ppn11")

  const [iSellThis, setISellThis] = useState(true)
  const [sellingPrice, setSellingPrice] = useState("0")
  const [salesAccountId, setSalesAccountId] = useState("")
  const [salesTax, setSalesTax] = useState("ppn11")

  const [trackInventory, setTrackInventory] = useState(true)
  const [minStock, setMinStock] = useState("0")
  const [inventoryAccountId, setInventoryAccountId] = useState("")

  // Initial Stock (Stok Awal)
  const [hasInitStock, setHasInitStock] = useState(false)
  const [initWarehouseId, setInitWarehouseId] = useState("")
  const [initStockDate, setInitStockDate] = useState(new Date().toISOString().split("T")[0])
  const [initQty, setInitQty] = useState("0")
  const [initCost, setInitCost] = useState("0")

  useEffect(() => {
    loadMasterData()
    generateSKU()
  }, [])

  const loadMasterData = async () => {
    setLoadingMaster(true)
    try {
      const [catRes, unitRes, accRes, whRes] = await Promise.all([
        InventoryAPI.getCategories().catch(() => []),
        api.get("/inventory/units").then(r => r.data).catch(() => []),
        api.get("/gl/accounts").then(r => r.data).catch(() => []),
        InventoryAPI.getWarehouses().catch(() => [])
      ])

      const cats = Array.isArray(catRes) ? catRes : (catRes?.data || [])
      setCategories(cats)

      const uList = Array.isArray(unitRes) ? unitRes : (unitRes?.data || [])
      setUnits(uList)

      const accList = Array.isArray(accRes) ? accRes : (accRes?.data || [])
      setAccounts(accList)

      const whList = Array.isArray(whRes) ? whRes : (whRes?.data || [])
      setWarehouses(whList)
      if (whList.length > 0) {
        setInitWarehouseId(whList[0].id)
      }
    } catch (err) {
      console.error("Error loading product master data:", err)
    } finally {
      setLoadingMaster(false)
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

  const handleSubmit = async (e: React.FormEvent, andAddAnother = false) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert("Nama produk wajib diisi.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = new FormData()
      payload.append("code", formData.code)
      payload.append("barcode", formData.barcode || formData.code)
      payload.append("name", formData.name.trim())
      payload.append("description", formData.description || "")
      payload.append("categoryId", formData.categoryId || "")
      payload.append("unitName", formData.unitName || "PCS")
      if (formData.unitId) payload.append("unitId", formData.unitId)

      // Prices
      payload.append("purchasePrice", iBuyThis ? (purchasePrice || "0") : "0")
      payload.append("sellingPrice", iSellThis ? (sellingPrice || "0") : "0")
      payload.append("minStock", trackInventory ? (minStock || "0") : "0")

      // Dimension & Weight
      let weightInGrams = 0
      if (weight) {
        const val = Number(weight)
        if (weightUnit === "gr") weightInGrams = val
        if (weightUnit === "kg") weightInGrams = val * 1000
        if (weightUnit === "ons") weightInGrams = val * 100
      }
      payload.append("weight", weightInGrams.toString())
      if (length) payload.append("length", length)
      if (width) payload.append("width", width)
      if (height) payload.append("height", height)

      // Images
      images.forEach((img) => {
        payload.append("images", img)
      })

      const res = await InventoryAPI.createProduct(payload)
      const createdProd = res?.data || res

      // If Initial Stock is provided and valid
      if (hasInitStock && trackInventory && Number(initQty) > 0 && initWarehouseId && createdProd?.id) {
        try {
          await api.post("/inventory/adjustment", {
            warehouseId: initWarehouseId,
            date: initStockDate,
            notes: `Stok Awal Produk ${formData.name}`,
            items: [
              {
                productId: createdProd.id,
                qty: Number(initQty),
                unitCost: Number(initCost) || Number(purchasePrice) || 0,
                type: "IN"
              }
            ]
          }).catch(e => console.warn("Initial stock warning:", e))
        } catch (e) {
          console.warn("Could not post initial stock adjustment:", e)
        }
      }

      alert("Produk berhasil ditambahkan ke inventori!")
      if (andAddAnother) {
        setFormData({
          name: "",
          code: "",
          barcode: "",
          categoryId: "",
          unitName: "pcs",
          unitId: "",
          description: "",
        })
        setImages([])
        setImagePreviews([])
        setPurchasePrice("0")
        setSellingPrice("0")
        setWeight("")
        setLength("")
        setWidth("")
        setHeight("")
        generateSKU()
      } else {
        router.push("/inventory/products")
      }
    } catch (err: any) {
      console.error(err)
      alert("Gagal menambahkan produk: " + (err.response?.data?.message || err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-28">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/inventory/products")} 
            className="rounded-lg h-9 w-9 border border-border hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-500">Inventori & Master Data</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Box className="w-6 h-6 text-indigo-600" /> Tambah Produk Standar
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Kelola detail barang, informasi harga beli/jual, akun akuntansi, dan pemantauan stok sesuai standar Mekari Jurnal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push("/inventory/products")}
            className="flex-1 sm:flex-none border-border"
          >
            Batal
          </Button>
          <Button 
            type="button" 
            variant="outline"
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e, true)}
            className="flex-1 sm:flex-none border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            Simpan & Tambah Baru
          </Button>
          <Button 
            type="button" 
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e, false)}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Simpan Produk
          </Button>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        
        {/* CARD 1: Informasi Umum Produk & Foto */}
        <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
          <div className="border-b border-border bg-muted/20 px-6 py-4 flex flex-row justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-foreground">1. Informasi Umum Produk</h2>
              <p className="text-xs text-muted-foreground">Identitas utama barang, barcode, unit satuan, dan kategori.</p>
            </div>
            <Button variant="ghost" size="sm" type="button" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-4 h-4" /> Petunjuk Pengisian
            </Button>
          </div>

          <CardContent className="p-6 space-y-6">
            
            {/* Foto Produk Multi-Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Foto Produk (Maksimal 8 Foto)</Label>
              <div className="flex flex-wrap gap-4 items-center">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg border border-border overflow-hidden group shadow-sm bg-background">
                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(idx)} 
                      className="absolute top-1.5 right-1.5 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 shadow transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-white text-[10px] text-center font-medium py-0.5">
                        Foto Utama
                      </span>
                    )}
                  </div>
                ))}
                {imagePreviews.length < 8 && (
                  <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-indigo-500 cursor-pointer flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-indigo-600 bg-background/50 hover:bg-indigo-50/10 transition-colors">
                    <Upload className="w-5 h-5" />
                    <span className="text-[11px] font-medium">Unggah Foto</span>
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Grid 1: Nama Produk, SKU / Kode, Barcode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                  Nama Produk <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  placeholder="Contoh: Kayu Meranti Oven 5x10x400" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  className="bg-background h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                    Kode Produk / SKU <span className="text-rose-500">*</span>
                  </Label>
                  <button 
                    type="button" 
                    onClick={generateSKU} 
                    className="text-[11px] text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" /> Auto Generate
                  </button>
                </div>
                <Input 
                  placeholder="PRD-00001" 
                  value={formData.code} 
                  onChange={(e) => setFormData({ ...formData, code: e.target.value, barcode: formData.barcode || e.target.value })} 
                  required
                  className="bg-background h-10 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Barcode / EAN</Label>
                <Input 
                  placeholder="Barcode pemindai scanner..." 
                  value={formData.barcode} 
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                  className="bg-background h-10 font-mono text-sm"
                />
              </div>
            </div>

            {/* Grid 2: Kategori, Satuan Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                  Kategori Produk <span className="text-rose-500">*</span>
                </Label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData({ ...formData, categoryId: val || "" })}>
                  <SelectTrigger className="w-full bg-background h-10 text-sm">
                    <SelectValue placeholder="-- Pilih Kategori Produk --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {categories.length === 0 && (
                      <SelectItem value="none" disabled>Belum ada kategori terdaftar</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                  Unit Satuan Dasar <span className="text-rose-500">*</span>
                </Label>
                <Select 
                  value={formData.unitName} 
                  onValueChange={(val) => setFormData({ ...formData, unitName: val || "pcs" })}
                >
                  <SelectTrigger className="w-full bg-background h-10 text-sm">
                    <SelectValue placeholder="Pilih Satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pcs (Pieces)</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="batang">Batang</SelectItem>
                    <SelectItem value="lembar">Lembar</SelectItem>
                    <SelectItem value="m3">M3 (Meter Kubik)</SelectItem>
                    <SelectItem value="kg">Kg (Kilogram)</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                    <SelectItem value="paket">Paket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid 3: Berat, Dimensi Panjang x Lebar x Tinggi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Berat Barang</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={weight} 
                    onChange={(e) => setWeight(e.target.value)} 
                    className="bg-background h-10 text-sm"
                  />
                  <Select value={weightUnit} onValueChange={(val: any) => setWeightUnit(val)}>
                    <SelectTrigger className="w-24 bg-background h-10 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gr">Gram (gr)</SelectItem>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="ons">Ons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Panjang</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="bg-background h-10 text-sm pr-10" 
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">cm</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Lebar</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="bg-background h-10 text-sm pr-10" 
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">cm</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Tinggi</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="bg-background h-10 text-sm pr-10" 
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">cm</span>
                </div>
              </div>
            </div>

            {/* Deskripsi Produk */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Deskripsi / Catatan Produk</Label>
              <Textarea 
                placeholder="Tuliskan spesifikasi produk, fungsi, catatan kualitas, atau keterangan lainnya..." 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="bg-background text-sm min-h-[90px] resize-y"
              />
            </div>

          </CardContent>
        </Card>

        {/* CARD 2: Harga Beli & Penjualan (Mekari Jurnal Standard) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SAYA BELI PRODUK INI */}
          <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
            <div className="border-b border-border bg-muted/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch 
                  id="buy-toggle" 
                  checked={iBuyThis} 
                  onCheckedChange={setIBuyThis} 
                />
                <div>
                  <Label htmlFor="buy-toggle" className="text-sm font-semibold cursor-pointer text-foreground">
                    Saya Beli Produk Ini
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Aktifkan jika produk dibeli dari supplier atau vendor.</p>
                </div>
              </div>
            </div>

            <CardContent className={`p-6 space-y-4 transition-opacity ${iBuyThis ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Harga Beli Satuan (HPP) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">Rp</span>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={purchasePrice} 
                    onChange={(e) => setPurchasePrice(e.target.value)} 
                    className="bg-background pl-10 h-10 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Akun Pembelian (Beban Pokok Pendapatan)</Label>
                <Select value={purchaseAccountId} onValueChange={(val) => setPurchaseAccountId(val || "")}>
                  <SelectTrigger className="w-full bg-background h-10 text-sm">
                    <SelectValue placeholder="(5-50000) - Beban Pokok Pendapatan" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="default_cogs">(5-50000) - Beban Pokok Pendapatan (HPP)</SelectItem>
                    {accounts.filter(a => a.category === 'EXPENSE' || a.account_type?.category === 'EXPENSE').map(a => (
                      <SelectItem key={a.id} value={a.id}>({a.account_code}) - {a.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Pajak Beli Default</Label>
                <Select value={purchaseTax} onValueChange={(val) => setPurchaseTax(val || "ppn11")}>
                  <SelectTrigger className="w-full bg-background h-10 text-sm">
                    <SelectValue placeholder="Pilih Pajak" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non">Bebas Pajak (0%)</SelectItem>
                    <SelectItem value="ppn11">PPN 11%</SelectItem>
                    <SelectItem value="ppn12">PPN 12%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* SAYA JUAL PRODUK INI */}
          <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
            <div className="border-b border-border bg-muted/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch 
                  id="sell-toggle" 
                  checked={iSellThis} 
                  onCheckedChange={setISellThis} 
                />
                <div>
                  <Label htmlFor="sell-toggle" className="text-sm font-semibold cursor-pointer text-foreground">
                    Saya Jual Produk Ini
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Aktifkan jika produk ditawarkan dan dijual ke pelanggan.</p>
                </div>
              </div>
            </div>

            <CardContent className={`p-6 space-y-4 transition-opacity ${iSellThis ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Harga Jual Satuan <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">Rp</span>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={sellingPrice} 
                    onChange={(e) => setSellingPrice(e.target.value)} 
                    required={iSellThis}
                    className="bg-background pl-10 h-10 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Akun Penjualan (Pendapatan)</Label>
                <Select value={salesAccountId} onValueChange={(val) => setSalesAccountId(val || "")}>
                  <SelectTrigger className="w-full bg-background h-10 text-sm">
                    <SelectValue placeholder="(4-40000) - Pendapatan Penjualan" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="default_revenue">(4-40000) - Pendapatan Penjualan</SelectItem>
                    {accounts.filter(a => a.category === 'REVENUE' || a.account_type?.category === 'REVENUE').map(a => (
                      <SelectItem key={a.id} value={a.id}>({a.account_code}) - {a.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Pajak Jual Default</Label>
                <Select value={salesTax} onValueChange={(val) => setSalesTax(val || "ppn11")}>
                  <SelectTrigger className="w-full bg-background h-10 text-sm">
                    <SelectValue placeholder="Pilih Pajak" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non">Bebas Pajak (0%)</SelectItem>
                    <SelectItem value="ppn11">PPN 11%</SelectItem>
                    <SelectItem value="ppn12">PPN 12%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* CARD 3: Pelacakan Persediaan & Stok Awal (Mekari Jurnal Style) */}
        <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
          <div className="border-b border-border bg-muted/20 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch 
                id="track-toggle" 
                checked={trackInventory} 
                onCheckedChange={setTrackInventory} 
              />
              <div>
                <Label htmlFor="track-toggle" className="text-sm font-semibold cursor-pointer text-foreground">
                  Saya Melacak Inventori / Persediaan Item Ini
                </Label>
                <p className="text-[11px] text-muted-foreground">Catat kartu stok, FIFO cost layer, dan pergerakan mutasi gudang secara otomatis.</p>
              </div>
            </div>
          </div>

          <CardContent className={`p-6 space-y-6 transition-opacity ${trackInventory ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Batas Stok Minimum (Peringatan Stok Rendah)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={minStock} 
                  onChange={(e) => setMinStock(e.target.value)} 
                  className="bg-background h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Akun Persediaan Barang Default</Label>
                <Select value={inventoryAccountId} onValueChange={(val) => setInventoryAccountId(val || "")}>
                  <SelectTrigger className="w-full bg-background h-10 text-sm">
                    <SelectValue placeholder="(1-10200) - Persediaan Barang" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="default_inventory">(1-10200) - Persediaan Barang Dagang</SelectItem>
                    {accounts.filter(a => a.category === 'ASSET' || a.account_type?.category === 'ASSET').map(a => (
                      <SelectItem key={a.id} value={a.id}>({a.account_code}) - {a.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sub-Section: Stok Awal */}
            <div className="pt-4 border-t border-border/60 space-y-4">
              <div className="flex items-center gap-3">
                <Switch 
                  id="init-stock-toggle" 
                  checked={hasInitStock} 
                  onCheckedChange={setHasInitStock} 
                />
                <div>
                  <Label htmlFor="init-stock-toggle" className="text-xs font-semibold cursor-pointer text-foreground">
                    Tentukan Saldo Stok Awal Saat Ini
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Jika produk sudah memiliki stok fisik di gudang sebelum transaksi dicatat.</p>
                </div>
              </div>

              {hasInitStock && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-muted/10 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold">Gudang Penyimpanan</Label>
                    <Select value={initWarehouseId} onValueChange={(val) => setInitWarehouseId(val || '')}>
                      <SelectTrigger className="bg-background h-9 text-xs">
                        <SelectValue placeholder="Pilih Gudang" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name} ({w.code || 'WH'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold">Tanggal Perolehan</Label>
                    <Input 
                      type="date" 
                      value={initStockDate} 
                      onChange={e => setInitStockDate(e.target.value)} 
                      className="bg-background h-9 text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold">Kuantitas Awal</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={initQty} 
                      onChange={e => setInitQty(e.target.value)} 
                      className="bg-background h-9 text-xs font-semibold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-semibold">Harga Pokok per Satuan (Rp)</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={initCost} 
                      onChange={e => setInitCost(e.target.value)} 
                      className="bg-background h-9 text-xs font-semibold" 
                    />
                  </div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Bottom Action Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-500" />
            <span>Pastikan nama produk, harga, dan satuan unit sudah sesuai sebelum menyimpan.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/inventory/products")}
              className="flex-1 sm:flex-none border-border"
            >
              Batalkan
            </Button>
            <Button 
              type="button" 
              variant="outline"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 sm:flex-none border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              Simpan & Tambah Baru
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] font-medium gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Simpan Produk
            </Button>
          </div>
        </div>

      </form>
    </div>
  )
}
