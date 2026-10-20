"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Button } from"@/components/ui/button"
import { Badge } from"@/components/ui/badge"
import { Label } from"@/components/ui/label"
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from"@/components/ui/table"
import { Search, Plus, Download, Box, LayoutGrid, AlertTriangle, RefreshCcw
, MoreHorizontal, Trash2, Edit2 } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BarChart3, PackageOpen, PackageX, FileText, Settings, CreditCard, ChevronRight, Check, HelpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { InventoryAPI } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import imageCompression from"browser-image-compression"

import { Upload, X, QrCode, Edit, ChevronDown, Store } from "lucide-react"
import Link from"next/link"
import {
 DropdownMenu,
 DropdownMenuCheckboxItem,
 DropdownMenuContent,
 DropdownMenuTrigger, DropdownMenuItem,
} from"@/components/ui/dropdown-menu"

export default function ProductInventory() {
 const [searchQuery, setSearchQuery] = useState("")
 const [showForm, setShowForm] = useState(false)
 const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
 const [formData, setFormData] = useState({ 
 code:"", barcode:"", name:"", weight:"", purchasePrice:"0", sellingPrice:"", description:"", categoryId:"" 
 })
 const [images, setImages] = useState<File[]>([])
  const [weightUnit, setWeightUnit] = useState<'gr' | 'kg' | 'ons'>('gr')
 
 // Real DB States
 const [loading, setLoading] = useState(true)
 const [isError, setIsError] = useState(false)
 const [products, setProducts] = useState<any[]>([])
 const [warehouses, setWarehouses] = useState<any[]>([])
  const [activeWarehouse, setActiveWarehouse] = useState<any>(null)
 const [categories, setCategories] = useState<any[]>([])

 // Column Visibility
 const [visibleColumns, setVisibleColumns] = useState({
 sku: true,
    weight: true,
 category: true,
 price: true,
 totalStock: true
 })

 useEffect(() => {
    const handleWarehouseChange = () => {
      const storedActive = localStorage.getItem("active_warehouse");
      if (storedActive && storedActive !== "null" && storedActive !== "undefined") {
        setActiveWarehouse(JSON.parse(storedActive));
      } else {
        setActiveWarehouse(null);
      }
    };
    
    // Initial load
    handleWarehouseChange();
    
    window.addEventListener("warehouse_changed", handleWarehouseChange);
    return () => window.removeEventListener("warehouse_changed", handleWarehouseChange);
  }, []);

  useEffect(() => {
   async function fetchData() {
 try {
 setLoading(true)
 setIsError(false)
 const storedActive = localStorage.getItem("active_warehouse");
      if (storedActive && storedActive !== "null" && storedActive !== "undefined") {
        setActiveWarehouse(JSON.parse(storedActive));
      } else {
        setActiveWarehouse(null);
      }
      
      const [dbProducts, whs, cats] = await Promise.all([
 InventoryAPI.getProducts(),
 InventoryAPI.getWarehouses(),
 InventoryAPI.getCategories()
 ])
 setWarehouses(whs)
 setCategories(cats)
 
 // Map Prisma products to UI format
 const mapped = dbProducts.map((p: any) => {
 // Map stocks by warehouse ID
 const stockMap: Record<string, number> = {}
 p.warehouse_stocks?.forEach((ws: any) => {
 stockMap[ws.warehouse_id] = ws.current_stock
 })
 
 return {
 id: p.id,
 sku: p.code,
 name: p.name,
 category: p.category?.name ||"-",
 price: Number(p.selling_price), weight: p.weight,
 stockMap, barcode: p.barcode, description: p.description, purchase_price: p.purchase_price, category_id: p.category_id }
 })
 setProducts(mapped)
 } catch (error) {
 console.error("Database connection failed:", error)
 setIsError(true)
 } finally {
 setLoading(false)
 }
 }
 fetchData()
 }, [])

 const handleUnitChange = (newUnit: 'gr' | 'kg' | 'ons') => {
    if (!formData.weight) {
      setWeightUnit(newUnit);
      return;
    }
    let inGrams = 0;
    const currentVal = Number(formData.weight);
    if (weightUnit === 'gr') inGrams = currentVal;
    if (weightUnit === 'kg') inGrams = currentVal * 1000;
    if (weightUnit === 'ons') inGrams = currentVal * 100;
    let newVal = 0;
    if (newUnit === 'gr') newVal = inGrams;
    if (newUnit === 'kg') newVal = inGrams / 1000;
    if (newUnit === 'ons') newVal = inGrams / 100;
    newVal = Math.round(newVal * 1000) / 1000;
    setFormData({ ...formData, weight: newVal.toString() });
    setWeightUnit(newUnit);
  }

  
  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    try {
      await InventoryAPI.deleteProduct(id);
      setProducts((Array.isArray(products) ? products : []).filter((p: any) => p.id !== id));
      alert('Produk berhasil dihapus');
    } catch (error: any) {
      console.error('Gagal menghapus produk:', error);
      alert('Gagal menghapus produk: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleEdit = (p: any) => {
    setFormData({
      code: p.sku || '',
      barcode: p.barcode || '',
      name: p.name || '',
      description: p.description || '',
      purchasePrice: p.purchase_price || '',
      sellingPrice: p.price || p.selling_price || '',
      weight: p.weight || '',
      categoryId: p.category_id || '',
    });
    setEditingId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateSKU = () => {
 const random = Math.floor(1000 + Math.random() * 9000);
 setFormData({ ...formData, code: `PRD-${random}` });
 };

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (!e.target.files) return;
 const files = Array.from(e.target.files);
 
 // limit max 8
 const remainingSlots = 8 - images.length;
 const filesToProcess = files.slice(0, remainingSlots);

 const options = {
 maxSizeMB: 2,
 maxWidthOrHeight: 1920,
 useWebWorker: true,
 };

 try {
 const compressedFiles = await Promise.all(
 filesToProcess.map(async (file) => {
 const compressedFile = await imageCompression(file, options);
 return new File([compressedFile], file.name, { type: file.type });
 })
 );
 setImages(prev => [...prev, ...compressedFiles]);
 } catch (error) {
 console.error("Error compressing images:", error);
 alert("Gagal mengompres gambar.");
 }
 };

 const removeImage = (index: number) => {
 setImages(prev => prev.filter((_, i) => i !== index));
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 setIsSubmitting(true)
 try {
 const payload = new FormData();
 payload.append("code", formData.code);
 payload.append("barcode", formData.barcode);
 payload.append("name", formData.name);
 payload.append("purchasePrice", formData.purchasePrice);
 payload.append("sellingPrice", formData.sellingPrice);
    payload.append("description", formData.description);
   let weightInGrams = 0;
   if (formData.weight) {
     const val = Number(formData.weight);
     if (weightUnit === 'gr') weightInGrams = val;
     if (weightUnit === 'kg') weightInGrams = val * 1000;
     if (weightUnit === 'ons') weightInGrams = val * 100;
   }
   payload.append("weight", weightInGrams.toString());
   payload.append("categoryId", formData.categoryId);
 
 images.forEach((img) => {
 payload.append("images", img);
 });

 if (editingId) {
        await InventoryAPI.updateProduct(editingId, payload);
      } else {
        await InventoryAPI.createProduct(payload);
      }
 setShowForm(false)
 setFormData({ code:"", barcode:"", name:"", weight:"", purchasePrice:"0", sellingPrice:"", description:"", categoryId:"" })
 setImages([])
 
 // Refresh Data
 const dbProducts = await InventoryAPI.getProducts()
 const mapped = dbProducts.map((p: any) => {
 const stockMap: Record<string, number> = {}
 p.warehouse_stocks?.forEach((ws: any) => {
 stockMap[ws.warehouse_id] = ws.current_stock
 })
 return {
 id: p.id,
 sku: p.code,
 name: p.name,
 category: p.category?.name ||"-",
 price: Number(p.selling_price), weight: p.weight,
 stockMap, barcode: p.barcode, description: p.description, purchase_price: p.purchase_price, category_id: p.category_id }
 })
 setProducts(mapped)
 } catch (error: any) {
  console.error("Failed to save product:", error)
 alert("Gagal menyimpan produk: " + (error?.response?.data?.message || error.message))
 } finally {
 setIsSubmitting(false)
 }
 }

 const formatIDR = (value: number) => {
 return new Intl.NumberFormat("id-ID", {
 style:"currency",
 currency:"IDR",
 maximumFractionDigits: 0
 }).format(value)
 }

 const filteredProducts = (Array.isArray(products) ? products : []).filter(p => 
 p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
 p.sku.toLowerCase().includes(searchQuery.toLowerCase())
 )

   const totalTersedia = filteredProducts.filter(p => { const s = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0); return s > 10; }).length;
  const totalHampirHabis = filteredProducts.filter(p => { const s = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0); return s > 0 && s <= 10; }).length;
  const totalHabis = filteredProducts.filter(p => { const s = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0); return s === 0; }).length;
  const totalStok = filteredProducts.reduce((sum, p) => sum + warehouses.reduce((s, wh) => s + (p.stockMap[wh.id] || 0), 0), 0);
  const totalNilai = filteredProducts.reduce((sum, p) => sum + (p.price * warehouses.reduce((s, wh) => s + (p.stockMap[wh.id] || 0), 0)), 0);
  const totalHPP = filteredProducts.reduce((sum, p) => sum + (Number(p.purchase_price || 0) * warehouses.reduce((s, wh) => s + (p.stockMap[wh.id] || 0), 0)), 0);

  return (
 <div className="space-y-6 animate-in fade-in duration-500 pb-10">
 
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Produk
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="bg-background">Laporan</Button>
          <Button variant="outline" size="sm" className="bg-background">Panduan</Button>
          <Button variant="outline" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent">Aturan Harga</Button>
          
          <DropdownMenu>
            <div className="flex shadow-md shadow-indigo-600/20 rounded-md">
              <Button size="sm" onClick={() => { setShowForm(!showForm); if (!showForm) { setEditingId(null); setFormData({code: "", barcode: "", name: "", description: "", purchasePrice: "", sellingPrice: "", weight: "", categoryId: ""}); } }} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-none border-r border-indigo-500">
                <Plus className="w-4 h-4 mr-1" /> {showForm ? "Batal" : "Tambah"}
              </Button>
              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-none px-2 h-9">
    <ChevronDown className="w-4 h-4" />
  </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={() => { setShowForm(!showForm); if (!showForm) { setEditingId(null); setFormData({code: "", barcode: "", name: "", description: "", purchasePrice: "", sellingPrice: "", weight: "", categoryId: ""}); } }} className="cursor-pointer py-2"><Box className="w-4 h-4 mr-3 text-muted-foreground" /> Tambah Produk</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2"><PackageOpen className="w-4 h-4 mr-3 text-muted-foreground" /> Tambah Produk Paket</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2"><LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" /> Tambah Produk Manufaktur</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2"><LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" /> Tambah Produk Varian</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2"><RefreshCcw className="w-4 h-4 mr-3 text-muted-foreground" /> Tambah Konversi Produk</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-2"><Store className="w-4 h-4 mr-3 text-muted-foreground" /> Tambah Produk dari Marketplace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="bg-background">Import</Button>
          <Button variant="outline" size="sm" className="bg-background">Print</Button>
          <Button variant="outline" size="icon" className="w-8 h-8 bg-background"><MoreHorizontal className="w-4 h-4" /></Button>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap pb-4 -mt-2">
        <div className="flex w-max gap-4 p-1">
          <Card className="w-[200px] shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Produk Stok Tersedia</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><PackageOpen className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalTersedia}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Produk Stok Hampir Habis</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><AlertTriangle className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalHampirHabis}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-rose-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Produk Stok Habis</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><PackageX className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalHabis}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total Stok</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Box className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">{totalStok}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[220px] shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total Nilai Produk</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><CreditCard className="w-4 h-4" /></div>
                <span className="text-xl font-bold">{formatIDR(totalNilai)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[220px] shadow-sm border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total HPP</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><FileText className="w-4 h-4" /></div>
                <span className="text-xl font-bold">{formatIDR(totalHPP)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="w-[200px] shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Total Penjualan</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><BarChart3 className="w-4 h-4" /></div>
                <span className="text-2xl font-bold">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex justify-center -mt-6 pb-2">
        <Button variant="ghost" size="sm" className="text-xs text-indigo-600">Lihat Selengkapnya <ChevronDown className="w-3 h-3 ml-1" /></Button>
      </div>



 
  {showForm && (
    <Card className="shadow-sm border-border bg-card animate-in slide-in-from-top-4 duration-300">
      <form onSubmit={handleSave}>
        <CardHeader className="border-b border-border/50 pb-4 flex flex-row justify-between items-center bg-muted/10">
          <CardTitle className="text-xl">Tambah Produk</CardTitle>
          <Button variant="outline" size="sm" type="button" className="bg-background gap-2"><HelpCircle className="w-4 h-4"/> Panduan</Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground border-dashed bg-muted/20">
            <ChevronRight className="w-4 h-4 mr-2" /> Tampilkan Gambar Produk
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex gap-1">Nama Produk <span className="text-rose-500">*</span></Label>
              <Input placeholder="Nama Produk" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="bg-background"/>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">Kode/SKU <HelpCircle className="w-3 h-3 text-muted-foreground" /></Label>
              <div className="flex gap-2">
                <Input placeholder="SKU/00004" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="bg-background"/>
                <Button type="button" variant="outline" onClick={generateSKU}>Generate</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex gap-1">Kategori <span className="text-rose-500">*</span></Label>
              <Select value={formData.categoryId} onValueChange={(val) => setFormData({...formData, categoryId: val || ""})}>
                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any, idx: number) => <SelectItem key={c?.id || idx} value={c?.id || `cat-${idx}`}>{c?.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Kategori Tambahan</Label>
              <Select>
                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pilih kategori tambahan" /></SelectTrigger>
                <SelectContent><SelectItem value="none" disabled>Tidak ada</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold flex gap-1">Satuan <span className="text-rose-500">*</span></Label>
            <Select defaultValue="pcs"><SelectTrigger className="w-full bg-background"><SelectValue placeholder="Pcs" /></SelectTrigger><SelectContent><SelectItem value="pcs">Pcs</SelectItem></SelectContent></Select>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Panjang</Label>
              <div className="relative"><Input type="number" placeholder="0" className="bg-background pr-10" /><span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Lebar</Label>
              <div className="relative"><Input type="number" placeholder="0" className="bg-background pr-10" /><span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tinggi</Label>
              <div className="relative"><Input type="number" placeholder="0" className="bg-background pr-10" /><span className="absolute right-3 top-2.5 text-xs text-muted-foreground">cm</span></div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Deskripsi</Label>
            <Input placeholder="Deskripsi" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-background" />
          </div>

          <Button type="button" variant="link" className="px-0 text-primary h-auto flex items-center text-sm font-medium">
            <Plus className="w-4 h-4 mr-1" /> Tampilkan pengaturan akun dan pajak
          </Button>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Switch defaultChecked id="buy-item" />
              <Label htmlFor="buy-item" className="font-semibold cursor-pointer">Saya membeli item ini</Label>
            </div>
            <div className="pl-14 space-y-2 max-w-xl">
              <Label className="text-xs font-semibold">Harga</Label>
              <Input type="number" placeholder="0" value={formData.purchasePrice} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} className="bg-background" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Switch defaultChecked id="sell-item" />
              <Label htmlFor="sell-item" className="font-semibold cursor-pointer">Saya menjual item ini</Label>
            </div>
            <div className="pl-14 flex gap-4 max-w-xl items-end">
              <div className="space-y-2 flex-1">
                <Label className="text-xs font-semibold">Harga</Label>
                <Input type="number" placeholder="0" value={formData.sellingPrice} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} required className="bg-background" />
              </div>
              <Button type="button" variant="link" className="text-primary px-0 mb-1"><Plus className="w-4 h-4 mr-1"/> Tampilkan Harga Grosir</Button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Switch defaultChecked id="track-item" />
              <Label htmlFor="track-item" className="font-semibold cursor-pointer">Saya melacak inventori item ini</Label>
            </div>
            <div className="pl-14 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex gap-1">Stok minimal <span className="text-rose-500">*</span></Label>
                <div className="flex items-center gap-2 mb-2">
                  <input type="radio" checked readOnly className="w-4 h-4 text-primary" />
                  <span className="text-sm">Sesuai pengaturan alur bisnis</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" readOnly className="w-4 h-4" />
                  <Input className="w-24 bg-background h-8" disabled />
                </div>
              </div>
              
              <div className="space-y-3 pt-4">
                <h4 className="font-semibold text-sm">Stok Awal</h4>
                <div className="flex items-center gap-3">
                  <Switch defaultChecked id="init-stock" />
                  <Label htmlFor="init-stock" className="text-sm cursor-pointer">Jika produk ini mempunyai stok awal</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Gudang</Label>
                    <Select><SelectTrigger className="bg-background"><SelectValue placeholder="Pilih gudang" /></SelectTrigger><SelectContent><SelectItem value="none" disabled>Pilih gudang</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tanggal</Label>
                    <Input type="date" className="bg-background" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Akun</Label>
                    <Select defaultValue="80100"><SelectTrigger className="bg-background"><SelectValue placeholder="8-80100 Penyesuaian Persediaan" /></SelectTrigger><SelectContent><SelectItem value="80100">8-80100 Penyesuaian Persediaan</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kuantitas</Label>
                    <Input type="number" placeholder="0" className="bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Harga Rata-rata</Label>
                    <Input type="number" placeholder="0" className="bg-background" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 dark:bg-slate-900/50 p-6 rounded-lg border border-indigo-100 dark:border-slate-800 flex flex-col items-center justify-center text-center mt-6">
            <div className="flex items-center gap-3 w-full justify-start mb-4">
              <Switch disabled id="serial-num" />
              <Label htmlFor="serial-num" className="text-muted-foreground">Produk ini mempunyai nomor seri / nomor produksi</Label>
            </div>
            <div className="bg-background border border-border p-6 rounded-lg shadow-sm max-w-sm w-full">
              <p className="font-semibold text-sm mb-4">Fitur Nomor Seri / Produksi tersedia di paket Champion</p>
              <Button type="button" className="bg-emerald-500 hover:bg-emerald-600 text-white w-full"><Check className="w-4 h-4 mr-2"/> Upgrade Sekarang</Button>
            </div>
          </div>

          <div className="space-y-2 pt-6">
            <Label className="font-semibold flex items-center gap-1"><LayoutGrid className="w-4 h-4" /> Ekstra <HelpCircle className="w-3 h-3 text-muted-foreground" /></Label>
            <Select><SelectTrigger className="bg-background"><SelectValue placeholder="Pilih grup ekstra" /></SelectTrigger><SelectContent><SelectItem value="none" disabled>Pilih grup ekstra</SelectItem></SelectContent></Select>
            <p className="text-xs text-muted-foreground mt-1">Pilih grup ekstra yang akan ditawarkan saat produk ini dipesan.</p>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-border/50">
            <Button type="submit" className="min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>

        </CardContent>
      </form>
    </Card>
  )}


 
      <Card className="border-border shadow-sm overflow-hidden mt-4">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row gap-4 justify-between bg-card">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="bg-background gap-2"><LayoutGrid className="w-4 h-4"/> Filter</Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutGrid className="w-4 h-4" /> Tampilkan stok per gudang
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-background gap-2"><Edit2 className="w-4 h-4"/> Ubah Massal</Button>
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama atau SKU..." 
                className="pl-9 bg-background border-border h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isError && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-rose-700">Koneksi Database Terputus</h4>
              <p className="text-sm text-rose-600">Saat ini menampilkan data dummy karena server MongoDB tidak dapat dihubungi.</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="w-[50px] text-center"><input type="checkbox" className="rounded" /></TableHead>
                <TableHead className="font-semibold">Nama</TableHead>
                <TableHead className="font-semibold">Kode/SKU</TableHead>
                <TableHead className="font-semibold">Kategori</TableHead>
                <TableHead className="font-semibold">Satuan</TableHead>
                <TableHead className="text-right font-semibold">Harga Beli</TableHead>
                <TableHead className="text-right font-semibold">Harga Jual</TableHead>
                <TableHead className="text-center font-semibold">Qty</TableHead>
                <TableHead className="text-right font-semibold">HPP</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">Tidak ada produk yang ditemukan.</TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => {
                  const totalStock = warehouses.reduce((sum, wh) => sum + (p.stockMap[wh.id] || 0), 0);
                  return (
                    <TableRow key={p.id} className="border-border/60 hover:bg-muted/20 transition-colors group">
                      <TableCell className="text-center"><input type="checkbox" className="rounded" /></TableCell>
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground flex items-center gap-2"><LayoutGrid className="w-3 h-3"/> {p.sku}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell>Pcs</TableCell>
                      <TableCell className="text-right">{formatIDR(Number(p.purchase_price || 0))}</TableCell>
                      <TableCell className="text-right">{formatIDR(p.price)}</TableCell>
                      <TableCell className="text-center font-semibold">{totalStock}</TableCell>
                      <TableCell className="text-right">{formatIDR(Number(p.purchase_price || 0))}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(p)} className="cursor-pointer"><Edit2 className="mr-2 h-4 w-4 text-indigo-500" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(p.id)} className="cursor-pointer text-rose-600 focus:bg-rose-50"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
              <TableRow className="bg-muted/10">
                <TableCell colSpan={7} className="font-bold text-foreground">Total</TableCell>
                <TableCell className="text-center font-bold text-foreground">{totalStok}</TableCell>
                <TableCell className="text-right font-bold text-foreground">{formatIDR(totalHPP)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t border-border flex justify-end items-center gap-4 text-sm text-muted-foreground">
          <span>Total {filteredProducts.length} data</span>
          <select className="border border-border rounded px-2 py-1 bg-background"><option>15 / halaman</option></select>
        </div>
      </Card>

    </div>
  )
}


















