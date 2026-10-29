"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api, InventoryAPI, PurchasingAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, ArrowLeft, Save, ShoppingCart, Loader2, Building2 } from "lucide-react"

export default function CreatePurchaseInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const po_id = searchParams.get("po_id")

  // Master Data
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Header State (Matches Mekari Jurnal: Supplier, Email, Alamat, Tgl Transaksi, Jatuh Tempo, Syarat Pembayaran, No Transaksi, No Ref Supplier, Tag, Gudang)
  const [supplierId, setSupplierId] = useState("")
  const [email, setEmail] = useState("")
  const [billingAddress, setBillingAddress] = useState("")
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [paymentTerms, setPaymentTerms] = useState("net30")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [supplierRef, setSupplierRef] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [tag, setTag] = useState("")
  const [taxInclusive, setTaxInclusive] = useState(false)

  // Items State (Produk, Deskripsi, Kuantitas, Unit, Harga satuan, Diskon %, Pajak %, Jumlah)
  const [items, setItems] = useState<any[]>([
    {
      id: "item-1",
      product_id: "",
      description: "",
      qty: 1,
      unit: "Pcs",
      price: 0,
      discount_percent: 0,
      tax_percent: 11,
      total: 0
    }
  ])

  // Bottom State (Pesan, Memo, Diskon Global, Biaya Pengiriman, Pemotongan)
  const [message, setMessage] = useState("")
  const [memo, setMemo] = useState("")
  const [globalDiscountVal, setGlobalDiscountVal] = useState(0)
  const [shippingFee, setShippingFee] = useState(0)
  const [withholdingTax, setWithholdingTax] = useState(0)

  // Fetch Master Data
  useEffect(() => {
    const fetchMaster = async () => {
      setLoading(true)
      try {
        const [supRes, whRes, prodRes] = await Promise.all([
          PurchasingAPI.getSuppliers().catch(() => ({ data: [] })),
          InventoryAPI.getWarehouses().catch(() => ({ data: [] })),
          InventoryAPI.getProducts().catch(() => ({ data: [] }))
        ])
        const sList = supRes?.data || supRes || []
        const wList = whRes?.data || whRes || []
        const pList = prodRes?.data || prodRes || []
        setSuppliers(sList)
        setWarehouses(wList)
        setProducts(pList)

        if (wList.length > 0 && !warehouseId) {
          setWarehouseId(wList[0].id)
        }
      } catch (err) {
        console.error("Error loading master data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMaster()
  }, [])

  // Auto-fill from PO if parameter provided
  useEffect(() => {
    if (po_id) {
      api.get(`/purchasing/orders/${po_id}`).then(res => {
        const po = res.data
        if (po) {
          setSupplierId(po.supplier_id || po.partner_id || "")
          setSupplierRef(po.order_number || "")
          if (po.items && po.items.length > 0) {
            setItems(po.items.map((it: any, idx: number) => ({
              id: `po-item-${idx}`,
              product_id: it.product_id,
              description: it.product?.name || "",
              qty: it.qty - (it.billed_qty || 0) > 0 ? it.qty - (it.billed_qty || 0) : it.qty,
              unit: it.unit || "Pcs",
              price: Number(it.price) || 0,
              discount_percent: Number(it.discount) || 0,
              tax_percent: it.taxRate ? Number(it.taxRate) * 100 : 11,
              total: ((it.qty - (it.billed_qty || 0) > 0 ? it.qty - (it.billed_qty || 0) : it.qty) * (Number(it.price) || 0))
            })))
          }
        }
      }).catch(console.error)
    }
  }, [po_id])

  // Helper to calculate due date based on transaction date and terms
  const calculateDueDate = (trxDateStr: string, term: string) => {
    if (!trxDateStr) return ""
    const [y, m, d] = trxDateStr.split("-").map(Number)
    const baseDate = new Date(y, m - 1, d)
    let days = 30
    if (term === "cod") days = 0
    else if (term === "net15") days = 15
    else if (term === "net30") days = 30
    else if (term === "net60") days = 60
    baseDate.setDate(baseDate.getDate() + days)
    const year = baseDate.getFullYear()
    const month = String(baseDate.getMonth() + 1).padStart(2, '0')
    const day = String(baseDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Handle Payment Terms change -> recalculate due date
  const handlePaymentTermsChange = (term: string | null) => {
    const validTerm = term || "net30"
    setPaymentTerms(validTerm)
    setDueDate(calculateDueDate(transactionDate, validTerm))
  }

  // Handle Transaction Date change -> recalculate due date
  const handleTransactionDateChange = (newDate: string) => {
    setTransactionDate(newDate)
    setDueDate(calculateDueDate(newDate, paymentTerms))
  }

  // Populate supplier details when selected
  useEffect(() => {
    if (supplierId) {
      const selected = suppliers.find(s => s.id === supplierId)
      if (selected) {
        setEmail(selected.email || "")
        setBillingAddress(selected.address || selected.company_name || "")
      }
    }
  }, [supplierId, suppliers])

  // Line item handlers
  const handleProductChange = (index: number, pId: string) => {
    const prod = products.find(p => p.id === pId)
    const newItems = [...items]
    newItems[index].product_id = pId
    newItems[index].description = prod?.name || ""
    newItems[index].price = prod?.buy_price || prod?.price || 0
    newItems[index].unit = prod?.unit || "Pcs"
    recalcRow(newItems, index)
    setItems(newItems)
  }

  const handleFieldChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value
    recalcRow(newItems, index)
    setItems(newItems)
  }

  const recalcRow = (arr: any[], index: number) => {
    const row = arr[index]
    const qty = Number(row.qty) || 0
    const price = Number(row.price) || 0
    const disc = Number(row.discount_percent) || 0
    const lineSubtotal = qty * price * (1 - disc / 100)
    row.total = lineSubtotal
  }

  const addRow = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        product_id: "",
        description: "",
        qty: 1,
        unit: "Pcs",
        price: 0,
        discount_percent: 0,
        tax_percent: 11,
        total: 0
      }
    ])
  }

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // Calculation
  const subtotal = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0)
  const totalTax = items.reduce((acc, it) => {
    const rowTotal = Number(it.total) || 0
    const rate = Number(it.tax_percent) || 0
    return acc + (rowTotal * (rate / 100))
  }, 0)
  const grandTotal = Math.max(0, subtotal - globalDiscountVal + totalTax + shippingFee - withholdingTax)

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId) {
      alert("Silakan pilih Supplier terlebih dahulu!")
      return
    }
    const validItems = items.filter(it => it.product_id && it.qty > 0)
    if (validItems.length === 0) {
      alert("Minimal masukkan 1 produk valid pada baris pembelian!")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        type: "AP",
        partner_id: supplierId,
        invoice_number: invoiceNumber || undefined,
        reference: supplierRef || undefined,
        issue_date: new Date(transactionDate).toISOString(),
        due_date: new Date(dueDate).toISOString(),
        warehouse_id: warehouseId || undefined,
        notes: message || undefined,
        memo: memo || undefined,
        subtotal: subtotal,
        tax_amount: totalTax,
        discount_amount: globalDiscountVal,
        total_amount: grandTotal,
        items: validItems.map(it => ({
          product_id: it.product_id,
          description: it.description,
          qty: Number(it.qty),
          unit: it.unit,
          unit_price: Number(it.price),
          discount_percent: Number(it.discount_percent),
          tax_percent: Number(it.tax_percent),
          total: Number(it.total)
        }))
      }

      await api.post("/finance/invoices", payload)
      alert("Faktur Pembelian berhasil disimpan ke Database!")
      router.push("/purchasing/invoices")
    } catch (err: any) {
      console.error(err)
      alert("Gagal menyimpan faktur pembelian: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen pb-28">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-2 cursor-pointer hover:text-foreground transition-colors w-fit" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Kembali</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            Buat Faktur Pembelian (Tagihan Vendor)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Dicocokkan dengan standar form pembelian Mekari Jurnal & langsung terhubung ke database.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" type="button" onClick={() => router.back()} disabled={submitting}>
            Batalkan
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Buat Tagihan
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Card */}
        <Card className="border shadow-sm bg-card">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">Informasi Tagihan & Supplier</CardTitle>
            <CardDescription>Masukkan rincian vendor dan ketentuan pembayaran</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Supplier */}
              <div className="space-y-2">
                <Label className="text-foreground">Supplier <span className="text-rose-500">*</span></Label>
                <Select value={supplierId} onValueChange={(val) => setSupplierId(val || "")}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Pilih Supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} {s.company_name ? `(${s.company_name})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@vendor.com" className="bg-muted border-border" />
              </div>

              {/* Alamat Penagihan */}
              <div className="space-y-2">
                <Label className="text-foreground">Alamat Penagihan</Label>
                <Input value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="Alamat lengkap supplier..." className="bg-muted border-border" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-border">
              {/* Tgl Transaksi */}
              <div className="space-y-2">
                <Label className="text-foreground">Tgl. Transaksi <span className="text-rose-500">*</span></Label>
                <Input type="date" value={transactionDate} onChange={e => handleTransactionDateChange(e.target.value)} className="bg-muted border-border" />
              </div>

              {/* Tgl Jatuh Tempo */}
              <div className="space-y-2">
                <Label className="text-foreground">Tgl. Jatuh Tempo</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-muted border-border" />
              </div>

              {/* Syarat Pembayaran */}
              <div className="space-y-2">
                <Label className="text-foreground">Syarat Pembayaran</Label>
                <Select value={paymentTerms} onValueChange={handlePaymentTermsChange}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Syarat Pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                    <SelectItem value="net15">Net 15 Hari</SelectItem>
                    <SelectItem value="net30">Net 30 Hari</SelectItem>
                    <SelectItem value="net60">Net 60 Hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* No Transaksi */}
              <div className="space-y-2">
                <Label className="text-foreground">No. Transaksi</Label>
                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="[Auto Generated]" className="bg-muted border-border font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
              {/* No Ref Supplier */}
              <div className="space-y-2">
                <Label className="text-foreground">Nomor Referensi Supplier</Label>
                <Input value={supplierRef} onChange={e => setSupplierRef(e.target.value)} placeholder="e.g. PO-2026-001 / Surat Jalan Vendor" className="bg-muted border-border" />
              </div>

              {/* Gudang */}
              <div className="space-y-2">
                <Label className="text-foreground">Gudang Penerima</Label>
                <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val || "")}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Pilih Gudang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag */}
              <div className="space-y-2">
                <Label className="text-foreground">Tag</Label>
                <Input value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. Operasional, Bahan Baku" className="bg-muted border-border" />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="taxInclusive" checked={taxInclusive} onCheckedChange={(val: any) => setTaxInclusive(!!val)} />
              <label htmlFor="taxInclusive" className="text-sm font-medium leading-none cursor-pointer">
                Harga termasuk pajak (Tax Inclusive)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Table */}
        <Card className="border shadow-sm bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">Produk & Biaya yang Dibeli</CardTitle>
            <CardDescription>Rincian barang/jasa dari supplier beserta kuantitas dan harga satuan</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[30%] font-semibold">Produk</TableHead>
                    <TableHead className="w-[20%] font-semibold">Deskripsi</TableHead>
                    <TableHead className="w-[10%] font-semibold text-center">Kuantitas</TableHead>
                    <TableHead className="w-[10%] font-semibold text-center">Unit</TableHead>
                    <TableHead className="w-[15%] font-semibold text-right">Harga Satuan</TableHead>
                    <TableHead className="w-[10%] font-semibold text-right">Diskon (%)</TableHead>
                    <TableHead className="w-[15%] font-semibold text-right">Jumlah</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, idx) => (
                    <TableRow key={row.id} className="hover:bg-muted/20 border-b">
                      <TableCell className="align-top py-3">
                        <Select value={row.product_id} onValueChange={(val) => handleProductChange(idx, val)}>
                          <SelectTrigger className="bg-muted border-border">
                            <SelectValue placeholder="Pilih Produk..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input value={row.description} onChange={(e) => handleFieldChange(idx, "description", e.target.value)} placeholder="Deskripsi baris..." className="bg-muted border-border" />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input type="number" min="1" value={row.qty} onChange={(e) => handleFieldChange(idx, "qty", Math.max(1, parseFloat(e.target.value) || 1))} className="bg-muted border-border text-center" />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input value={row.unit} onChange={(e) => handleFieldChange(idx, "unit", e.target.value)} className="bg-muted border-border text-center" />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input type="number" value={row.price} onChange={(e) => handleFieldChange(idx, "price", parseFloat(e.target.value) || 0)} className="bg-muted border-border text-right font-medium" />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Input type="number" min="0" max="100" value={row.discount_percent} onChange={(e) => handleFieldChange(idx, "discount_percent", parseFloat(e.target.value) || 0)} className="bg-muted border-border text-right" />
                      </TableCell>
                      <TableCell className="align-top py-3 text-right font-semibold">
                        <div className="h-10 flex items-center justify-end">
                          {formatIDR(row.total)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3 text-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={items.length === 1} className="text-muted-foreground hover:text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 border-t border-border bg-muted/20">
              <Button type="button" variant="outline" onClick={addRow} className="gap-2 bg-card text-indigo-600 border-border hover:bg-indigo-50">
                <Plus className="h-4 w-4" /> Tambah Baris Produk
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Notes & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border shadow-sm bg-card">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base">Catatan & Memo Internal</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Pesan untuk Supplier</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tuliskan pesan yang tertera di dokumen tagihan..." className="resize-none h-20 bg-muted border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Memo Internal (Hanya dilihat staf)</Label>
                <Textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="Catatan internal audit / verifikasi..." className="resize-none h-20 bg-muted border-border" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base">Ringkasan Nilai Tagihan</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Diskon Global</span>
                <div className="w-36">
                  <Input type="number" min="0" value={globalDiscountVal} onChange={e => setGlobalDiscountVal(parseFloat(e.target.value) || 0)} className="h-8 text-right bg-muted text-xs" />
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Pajak (PPN)</span>
                <span className="font-medium text-foreground">{formatIDR(totalTax)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Biaya Pengiriman</span>
                <div className="w-36">
                  <Input type="number" min="0" value={shippingFee} onChange={e => setShippingFee(parseFloat(e.target.value) || 0)} className="h-8 text-right bg-muted text-xs" />
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Pemotongan (PPh / PPh 23)</span>
                <div className="w-36">
                  <Input type="number" min="0" value={withholdingTax} onChange={e => setWithholdingTax(parseFloat(e.target.value) || 0)} className="h-8 text-right bg-muted text-xs" />
                </div>
              </div>

              <div className="pt-3 border-t border-dashed flex justify-between items-center">
                <span className="text-base font-semibold">Total Sisa Tagihan (Hutang)</span>
                <span className="text-2xl font-bold text-indigo-600">{formatIDR(grandTotal)}</span>
              </div>

              <div className="pt-4">
                <Button type="button" onClick={handleSubmit} disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-5">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  Simpan Faktur Tagihan Vendor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
