"use client"
import { useState, useEffect } from "react"
import { PurchasingAPI, InventoryAPI, api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, Trash2, ArrowLeft, Building2, Warehouse as WarehouseIcon, 
  Calendar, FileText, CheckCircle2, ShoppingCart, Image as ImageIcon, Loader2
} from "lucide-react"
import Link from "next/link"
import { QuickAddCustomerModal, QuickAddProductModal } from "@/components/sales/quick-modals"

interface OrderItem {
  productId: string
  productName?: string
  productCode?: string
  imageUrl?: string
  qty: number
  price: number
  taxRate: number
  discount: number
}

export default function CreateOrderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Master Data
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [activeItemIndexForModal, setActiveItemIndexForModal] = useState<number | null>(null)

  // Form State
  const [form, setForm] = useState({
    partnerId: "",
    warehouseId: "",
    orderDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    expectedReceipt: "",
    notes: "",
    paymentTerms: "Net 30",
    paymentMethod: "BANK_TRANSFER",
    autoReceive: true,   // Otomatis masukkan stok & update HPP
    autoBill: true,      // Otomatis buat faktur pembelian
    autoPay: true        // Otomatis tandai lunas
  })

  const [items, setItems] = useState<OrderItem[]>([
    { productId: "", qty: 1, price: 0, taxRate: 0, discount: 0 }
  ])

  // Load Data
  const loadMasterData = async () => {
    try {
      setInitialLoading(true)
      const [supRes, prodRes, whRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
        InventoryAPI.getProducts().catch(() => []),
        InventoryAPI.getWarehouses().catch(() => [])
      ])

      const rawSuppliers = supRes?.data?.data || supRes?.data || (Array.isArray(supRes) ? supRes : [])
      const rawProducts = prodRes?.data || (Array.isArray(prodRes) ? prodRes : [])
      const rawWarehouses = whRes?.data || (Array.isArray(whRes) ? whRes : [])

      setSuppliers(rawSuppliers)
      setProducts(rawProducts)
      setWarehouses(rawWarehouses)

      if (rawWarehouses.length > 0 && !form.warehouseId) {
        setForm(prev => ({ ...prev, warehouseId: rawWarehouses[0].id }))
      }
    } catch (err) {
      console.error("Error loading purchasing form data:", err)
      toast({ title: "Gagal memuat master data", variant: "destructive" })
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    loadMasterData()
  }, [])

  // Handle item change
  const handleItemChange = (index: number, field: keyof OrderItem, val: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: val }

    // If changing product, auto-fill price from product purchase_price
    if (field === "productId") {
      const selected = products.find(p => p.id === val)
      if (selected) {
        updated[index].price = Number(selected.purchase_price || selected.cost_price || 0)
        updated[index].productName = selected.name
        updated[index].productCode = selected.code
        updated[index].imageUrl = selected.images?.[0]?.image_url || null
      }
    }
    setItems(updated)
  }

  const addItemRow = () => {
    setItems([...items, { productId: "", qty: 1, price: 0, taxRate: 0, discount: 0 }])
  }

  const removeItemRow = (idx: number) => {
    if (items.length === 1) {
      setItems([{ productId: "", qty: 1, price: 0, taxRate: 0, discount: 0 }])
      return
    }
    setItems(items.filter((_, i) => i !== idx))
  }

  // Calculations (Mekari Jurnal Style)
  const calculateTotals = () => {
    let subtotal = 0
    let totalDiscount = 0
    let totalTax = 0

    items.forEach(item => {
      const lineSub = Number(item.qty || 0) * Number(item.price || 0)
      const lineDisc = Number(item.discount || 0)
      const afterDisc = Math.max(0, lineSub - lineDisc)
      const lineTax = afterDisc * (Number(item.taxRate || 0) / 100)

      subtotal += lineSub
      totalDiscount += lineDisc
      totalTax += lineTax
    })

    const grandTotal = subtotal - totalDiscount + totalTax
    return { subtotal, totalDiscount, totalTax, grandTotal }
  }

  const totals = calculateTotals()

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.partnerId) return toast({ title: "Pilih Supplier terlebih dahulu", variant: "destructive" })
    if (items.length === 0 || !items.some(i => i.productId)) {
      return toast({ title: "Pilih minimal 1 produk/barang", variant: "destructive" })
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        supplierId: form.partnerId,
        orderDate: new Date(form.orderDate),
        expectedReceipt: form.expectedReceipt ? new Date(form.expectedReceipt) : null,
        items: items
          .filter(i => i.productId)
          .map(i => ({
            productId: i.productId,
            qty: Number(i.qty),
            price: Number(i.price),
            taxRate: Number(i.taxRate) / 100,
            discount: Number(i.discount || 0)
          })),
        autoReceive: form.autoReceive,
        autoBill: form.autoBill,
        autoPay: form.autoPay,
        paymentMethod: form.paymentMethod
      }

      await PurchasingAPI.createRFQ(payload)

      toast({ 
        title: "Pesanan Pembelian Berhasil Dibuat", 
        description: form.autoReceive ? "Stok produk dan HPP inventori otomatis diperbarui!" : "PO siap diproses."
      })
      router.push("/purchasing/orders")
    } catch (err: any) {
      console.error(err)
      toast({ 
        title: "Gagal membuat Order", 
        description: err?.response?.data?.message || err?.message || "Terjadi kesalahan", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/purchasing/orders")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Buat Pembelian (Purchase Order)</h1>
            <p className="text-muted-foreground text-sm">
              Standar Jurnal: Catat tagihan pembelian, kelola HPP, dan otomasi stok persediaan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push("/purchasing/orders")}>
            Batal
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={loading || initialLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-6 font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {form.autoReceive ? "Beli & Masukkan Stok" : "Buat Pesanan Pembelian"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Data Supplier & Pembelian */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> Informasi Supplier & Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Supplier Selection + Quick Add */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Supplier / Vendor <span className="text-rose-500">*</span></Label>
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Tambah Baru
                </button>
              </div>
              <Select value={form.partnerId} onValueChange={(v) => setForm({ ...form, partnerId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Pilih Supplier --" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-semibold text-foreground">{s.name}</span>
                        {s.phone && <span className="text-[11px] text-muted-foreground">{s.phone}</span>}
                      </div>
                    </SelectItem>
                  ))}
                  {suppliers.length === 0 && (
                    <div className="p-3 text-xs text-center text-muted-foreground">Belum ada supplier terdaftar</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse Destination */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Gudang Penyimpanan Tujuan <span className="text-rose-500">*</span></Label>
              <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Gudang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="font-medium">{w.name}</span> {w.code && <span className="text-xs text-muted-foreground">({w.code})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tanggal Transaksi */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tanggal Transaksi</Label>
              <Input 
                type="date" 
                value={form.orderDate} 
                onChange={e => setForm({ ...form, orderDate: e.target.value })} 
                required 
              />
            </div>

            {/* Ekspektasi Kedatangan */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Ekspektasi Barang Datang</Label>
              <Input 
                type="date" 
                value={form.expectedReceipt} 
                onChange={e => setForm({ ...form, expectedReceipt: e.target.value })} 
              />
            </div>

            {/* Syarat Pembayaran */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Syarat Pembayaran</Label>
              <Select value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Termin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash on Delivery">Cash on Delivery (COD)</SelectItem>
                  <SelectItem value="Net 15">Net 15 Hari</SelectItem>
                  <SelectItem value="Net 30">Net 30 Hari</SelectItem>
                  <SelectItem value="Net 60">Net 60 Hari</SelectItem>
                  <SelectItem value="Tunai">Tunai / Transfer Langsung</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Metode Pembayaran</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Metode Bayar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                  <SelectItem value="CASH">Kas Tunai</SelectItem>
                  <SelectItem value="GIRO">Giro / Cek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pengaturan Otomasi Persediaan & HPP ala Jurnal */}
        <Card className="border-indigo-100 bg-indigo-50/30 dark:bg-indigo-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div className="space-y-0.5 pr-2">
                  <div className="text-sm font-semibold text-foreground">Masuk Stok Langsung</div>
                  <div className="text-xs text-muted-foreground">Tambah stok & HPP ke inventori otomatis</div>
                </div>
                <Switch 
                  checked={form.autoReceive} 
                  onCheckedChange={(checked) => setForm({ ...form, autoReceive: checked })} 
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div className="space-y-0.5 pr-2">
                  <div className="text-sm font-semibold text-foreground">Buat Tagihan Langsung</div>
                  <div className="text-xs text-muted-foreground">Catat tagihan invoice pembelian otomatis</div>
                </div>
                <Switch 
                  checked={form.autoBill} 
                  disabled={!form.autoReceive}
                  onCheckedChange={(checked) => setForm({ ...form, autoBill: checked })} 
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                <div className="space-y-0.5 pr-2">
                  <div className="text-sm font-semibold text-foreground">Tandai Lunas Langsung</div>
                  <div className="text-xs text-muted-foreground">Kurangi uang kas/bank & lunasi hutang</div>
                </div>
                <Switch 
                  checked={form.autoPay} 
                  disabled={!form.autoBill || !form.autoReceive}
                  onCheckedChange={(checked) => setForm({ ...form, autoPay: checked })} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Rincian Barang (Line Items Table - Jurnal Style) */}
        <Card className="shadow-sm border-border overflow-visible">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-500" />
              <CardTitle className="text-base font-semibold">Rincian Barang / Produk</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setActiveItemIndexForModal(null)
                  setProductModalOpen(true)
                }}
                className="text-xs h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Produk Baru (+ Foto)
              </Button>
              <Button type="button" variant="default" size="sm" onClick={addItemRow} className="text-xs h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Baris
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase font-medium">
                  <th className="text-left py-2 px-2 w-[40px]">#</th>
                  <th className="text-left py-2 px-2 min-w-[260px]">Produk / Barang</th>
                  <th className="text-right py-2 px-2 w-[110px]">Kuantitas</th>
                  <th className="text-right py-2 px-2 w-[160px]">Harga Beli Satuan (Rp)</th>
                  <th className="text-right py-2 px-2 w-[110px]">Pajak (%)</th>
                  <th className="text-right py-2 px-2 w-[130px]">Diskon (Rp)</th>
                  <th className="text-right py-2 px-2 w-[150px]">Total (Rp)</th>
                  <th className="text-center py-2 px-2 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((item, index) => {
                  const lineSub = Number(item.qty || 0) * Number(item.price || 0)
                  const lineDisc = Number(item.discount || 0)
                  const lineTax = Math.max(0, lineSub - lineDisc) * (Number(item.taxRate || 0) / 100)
                  const lineTotal = lineSub - lineDisc + lineTax

                  return (
                    <tr key={index} className="hover:bg-muted/30 transition">
                      {/* No */}
                      <td className="py-2.5 px-2 text-xs text-muted-foreground">{index + 1}</td>

                      {/* Product Selector */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt="Item" 
                              className="w-9 h-9 rounded object-cover border border-border shrink-0 bg-muted" 
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-muted/60 border border-border/80 flex items-center justify-center shrink-0 text-muted-foreground">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Select 
                              value={item.productId} 
                              onValueChange={(val) => handleItemChange(index, "productId", val)}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="-- Pilih Produk --" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    <div className="flex items-center gap-2 text-left py-0.5">
                                      {p.images?.[0]?.image_url ? (
                                        <img src={p.images[0].image_url} alt="" className="w-5 h-5 rounded object-cover" />
                                      ) : null}
                                      <div>
                                        <span className="font-semibold">{p.name}</span>
                                        <span className="text-[11px] text-muted-foreground ml-2">[{p.code}]</span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 px-2">
                        <Input
                          type="number"
                          min="1"
                          className="h-9 text-right text-xs"
                          value={item.qty}
                          onChange={e => handleItemChange(index, "qty", Math.max(1, Number(e.target.value) || 0))}
                        />
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-2">
                        <Input
                          type="number"
                          min="0"
                          className="h-9 text-right text-xs"
                          value={item.price}
                          onChange={e => handleItemChange(index, "price", Number(e.target.value) || 0)}
                        />
                      </td>

                      {/* Tax */}
                      <td className="py-2.5 px-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="h-9 text-right text-xs"
                          placeholder="0"
                          value={item.taxRate}
                          onChange={e => handleItemChange(index, "taxRate", Number(e.target.value) || 0)}
                        />
                      </td>

                      {/* Discount */}
                      <td className="py-2.5 px-2">
                        <Input
                          type="number"
                          min="0"
                          className="h-9 text-right text-xs"
                          placeholder="0"
                          value={item.discount}
                          onChange={e => handleItemChange(index, "discount", Number(e.target.value) || 0)}
                        />
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-2 text-right font-semibold text-xs text-foreground">
                        Rp {lineTotal.toLocaleString("id-ID")}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemRow(index)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Card 4: Summary & Catatan ala Jurnal */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-4">
            <Card className="shadow-sm border-border h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Catatan & Keterangan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Tambahkan catatan untuk supplier atau nomor PO eksternal..."
                  rows={4}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="text-xs resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Catatan ini akan tercetak pada formulir pesanan pembelian (PO) dan faktur supplier.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-5">
            <Card className="shadow-sm border-border bg-card">
              <CardHeader className="pb-2 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">Ringkasan Pembelian</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">Rp {totals.subtotal.toLocaleString("id-ID")}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Total Diskon</span>
                    <span>- Rp {totals.totalDiscount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {totals.totalTax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pajak</span>
                    <span className="font-medium text-foreground">+ Rp {totals.totalTax.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-foreground">Total Tagihan</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    Rp {totals.grandTotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Quick Add Modals */}
      <QuickAddCustomerModal
        open={supplierModalOpen}
        onOpenChange={setSupplierModalOpen}
        isSupplier={true}
        onSuccess={(newSupplier) => {
          setSuppliers(prev => [newSupplier, ...prev])
          setForm(prev => ({ ...prev, partnerId: newSupplier.id }))
          toast({ title: `Supplier ${newSupplier.name} berhasil ditambahkan!` })
        }}
      />

      <QuickAddProductModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        onSuccess={(newProd) => {
          setProducts(prev => [newProd, ...prev])
          if (activeItemIndexForModal !== null) {
            handleItemChange(activeItemIndexForModal, "productId", newProd.id)
          } else if (items.length > 0 && !items[items.length - 1].productId) {
            handleItemChange(items.length - 1, "productId", newProd.id)
          } else {
            setItems(prev => [
              ...prev,
              {
                productId: newProd.id,
                productName: newProd.name,
                productCode: newProd.code,
                imageUrl: newProd.images?.[0]?.image_url || null,
                qty: 1,
                price: Number(newProd.purchase_price || 0),
                taxRate: 0,
                discount: 0
              }
            ])
          }
          toast({ title: `Produk ${newProd.name} berhasil ditambahkan!` })
        }}
      />
    </div>
  )
}
