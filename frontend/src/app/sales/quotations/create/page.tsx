"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api, B2BApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { QuickAddCustomerModal, QuickAddProductModal, QuickAddTaxModal } from "@/components/sales/quick-modals"
import { 
  Plus, Trash2, ArrowLeft, FileSpreadsheet, Paperclip, Loader2
} from "lucide-react"

export default function CreateQuotationPage() {
  const router = useRouter()

  // Master Data
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Header / Top Form State
  const [customerId, setCustomerId] = useState("")
  const [email, setEmail] = useState("")
  const [billingAddress, setBillingAddress] = useState("")
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [expirationDate, setExpirationDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [paymentTerms, setPaymentTerms] = useState("net30")
  const [transactionNo, setTransactionNo] = useState("")
  const [clientRef, setClientRef] = useState("")
  const [tag, setTag] = useState("")
  const [currency, setCurrency] = useState("IDR")
  const [taxInclusive, setTaxInclusive] = useState(false)
  // Quick Modals State
  const [custModalOpen, setCustModalOpen] = useState(false)
  const [prodModalOpen, setProdModalOpen] = useState(false)
  const [taxModalOpen, setTaxModalOpen] = useState(false)
  const [activeItemTaxIndex, setActiveItemTaxIndex] = useState<number | null>(null)
  const [availableTaxes, setAvailableTaxes] = useState([
    { id: 'ppn11', name: 'PPN', rate: 11 },
    { id: 'ppn12', name: 'PPN 12%', rate: 12 },
    { id: 'pph23', name: 'PPh 23 (2%)', rate: 2 },
    { id: 'non', name: 'Bebas Pajak (0%)', rate: 0 }
  ])

  // Items State (Produk, Deskripsi, Kuantitas, Unit, Harga Satuan, Diskon %, Pajak %, Jumlah)
  const [items, setItems] = useState<any[]>([
    {
      id: "item-1",
      product_id: "",
      description: "",
      qty: 1,
      unit: "Pcs",
      price: 0,
      discount_percent: 0,
      tax_percent: 0,
      total: 0
    }
  ])

  // Bottom State
  const [message, setMessage] = useState("")
  const [memo, setMemo] = useState("")
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent")
  const [globalDiscountVal, setGlobalDiscountVal] = useState(0)

  // Load Initial Master Data
  useEffect(() => {
    const fetchMaster = async () => {
      setLoading(true)
      try {
        const [cRes, pRes] = await Promise.all([
          api.get("/customers").catch(() => ({ data: [] })),
          api.get("/inventory/products").catch(() => ({ data: [] }))
        ])
        const custList = cRes.data?.data || cRes.data || []
        const prodList = pRes.data?.data || pRes.data || []
        setCustomers(custList)
        setProducts(prodList)
      } catch (e) {
        console.error("Error fetching master data:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMaster()
  }, [])

  // When customer changes, populate email & address
  const handleCustomerChange = (cId: string | null) => {
    const validId = cId || ""
    setCustomerId(validId)
    const found = customers.find(c => c.id === validId)
    if (found) {
      setEmail(found.email || "")
      setBillingAddress(found.address || "")
    }
  }

  // Helper to calculate expiration date based on transaction date and terms
  const calculateExpirationDate = (trxDateStr: string, term: string) => {
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

  // When payment terms change, recalculate expiration date
  const handlePaymentTermsChange = (term: string | null) => {
    const validTerm = term || "net30"
    setPaymentTerms(validTerm)
    setExpirationDate(calculateExpirationDate(transactionDate, validTerm))
  }

  // When transaction date changes, update expiration date accordingly
  const handleTransactionDateChange = (newDate: string) => {
    setTransactionDate(newDate)
    setExpirationDate(calculateExpirationDate(newDate, paymentTerms))
  }

  // Handle Item Row change
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: value }

    if (field === "product_id") {
      const prod = products.find(p => p.id === value)
      if (prod) {
        item.description = prod.name || ""
        item.price = Number(prod.price || prod.sale_price || prod.selling_price || 0)
        item.unit = prod.unit?.name || prod.unit || "Pcs"
      }
    }

    const qty = Number(item.qty || 0)
    const price = Number(item.price || 0)
    const discPct = Number(item.discount_percent || 0)
    const taxPct = Number(item.tax_percent || 0)
    const gross = qty * price
    const lineDiscount = (gross * discPct) / 100
    const taxableBase = Math.max(0, gross - lineDiscount)
    const lineTax = (taxableBase * taxPct) / 100
    item.total = taxableBase + lineTax

    updated[index] = item
    setItems(updated)
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
        tax_percent: 0,
        total: 0
      }
    ])
  }

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // Calculations
  const subtotal = items.reduce((acc, it) => {
    const gross = (Number(it.qty) || 0) * (Number(it.price) || 0)
    const disc = (gross * (Number(it.discount_percent) || 0)) / 100
    return acc + Math.max(0, gross - disc)
  }, 0)
  const lineTaxTotal = items.reduce((acc, it) => {
    const gross = (Number(it.qty) || 0) * (Number(it.price) || 0)
    const disc = (gross * (Number(it.discount_percent) || 0)) / 100
    const base = Math.max(0, gross - disc)
    return acc + ((base * (Number(it.tax_percent) || 0)) / 100)
  }, 0)
  const lineDiscountTotal = items.reduce((acc, it) => {
    const gross = (Number(it.qty) || 0) * (Number(it.price) || 0)
    return acc + (gross * (Number(it.discount_percent) || 0) / 100)
  }, 0)

  const globalDiscount = discountType === "percent"
    ? (subtotal * Number(globalDiscountVal || 0)) / 100
    : Number(globalDiscountVal || 0)

  const total = Math.max(0, subtotal - globalDiscount + lineTaxTotal)
  const balanceDue = total

  // Format Currency
  const formatCurrency = (val: number) => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }).format(val || 0)
    }
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  // Save / Submit Quotation
  const handleSubmit = async (status: string = "DRAFT") => {
    if (!customerId) {
      alert("Pilih pelanggan terlebih dahulu!")
      return
    }

    const validItems = items.filter(it => it.product_id)
    if (validItems.length === 0) {
      alert("Masukkan minimal 1 produk pada rincian penawaran!")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customerId,
        quotation_number: transactionNo || undefined,
        quotation_date: transactionDate,
        expiration_date: expirationDate,
        email,
        billing_address: billingAddress,
        payment_terms: paymentTerms,
        tag,
        client_ref: clientRef,
        message,
        memo,
        currency,
        subtotal,
        discount_percent: discountType === "percent" ? globalDiscountVal : 0,
        discount_amount: globalDiscount,
        total,
        status,
        items: validItems.map(it => ({
          productId: it.product_id,
          description: it.description,
          qty: Number(it.qty),
          unit: it.unit,
          price: Number(it.price),
          discount: (Number(it.qty) * Number(it.price) * (Number(it.discount_percent) || 0)) / 100,
          tax: lineTaxTotal,
          subtotal: it.total
        }))
      }

      await B2BApi.createQuotation(payload)
      alert(status === "DRAFT" ? "Draf Penawaran Penjualan berhasil disimpan!" : "Penawaran Penjualan berhasil dibuat & dikirim!")
      router.push("/sales")
    } catch (err: any) {
      console.error(err)
      alert("Gagal membuat penawaran penjualan: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-background min-h-screen text-foreground max-w-7xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/sales")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Penjualan</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
              Buat Penawaran Penjualan
            </h1>
          </div>
        </div>

        {/* Total Badge in Top Right */}
        <div className="text-right">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Penawaran</span>
          <span className="text-2xl font-black text-indigo-600">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Main Form Body */}
      <Card className="border border-border/80 shadow-sm bg-card">
        <CardContent className="p-6 md:p-8 space-y-8">
          
          {/* Row 1: Pelanggan & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1">
                  Pelanggan <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setCustModalOpen(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Pelanggan Baru
                </button>
              </div>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Pilih atau cari kontak..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email</Label>
              <Input 
                type="email"
                placeholder="email@pelanggan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>

          {/* Row 2: Alamat Penagihan, Tgl Transaksi, Tgl Kedaluwarsa, Syarat Pembayaran */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2 md:col-span-1">
              <Label className="text-sm font-semibold">Alamat Penagihan</Label>
              <Textarea 
                placeholder="Alamat lengkap penagihan..."
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={3}
                className="bg-background border-border text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1">
                Tgl. Transaksi <span className="text-rose-500">*</span>
              </Label>
              <Input 
                type="date"
                value={transactionDate}
                onChange={(e) => handleTransactionDateChange(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tgl. Kedaluwarsa</Label>
              <Input 
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Syarat Pembayaran</Label>
              <Select value={paymentTerms} onValueChange={handlePaymentTermsChange}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Pilih syarat pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                  <SelectItem value="net15">Net 15 Hari</SelectItem>
                  <SelectItem value="net30">Net 30 Hari</SelectItem>
                  <SelectItem value="net60">Net 60 Hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: No Transaksi, No Referensi Pelanggan, Tag, Mata Uang */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">No Transaksi</Label>
              <Input 
                placeholder="[Auto]"
                value={transactionNo}
                onChange={(e) => setTransactionNo(e.target.value)}
                className="bg-background border-border placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">No. Referensi Pelanggan</Label>
              <Input 
                placeholder="Contoh: REF-CUST-0091"
                value={clientRef}
                onChange={(e) => setClientRef(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tag</Label>
              <Input 
                placeholder="Pilih atau ketik tag..."
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Mata Uang</Label>
              <Select value={currency} onValueChange={(val) => setCurrency(val || "IDR")}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Mata uang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checkbox: Harga termasuk pajak */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="taxInclusive" 
              checked={taxInclusive} 
              onCheckedChange={(checked) => setTaxInclusive(Boolean(checked))} 
            />
            <label
              htmlFor="taxInclusive"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Harga termasuk pajak
            </label>
          </div>

          {/* Table Items */}
          <div className="border border-border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border">
                <TableRow>
                  <TableHead className="w-[240px] font-bold text-foreground">
                    <div className="flex items-center justify-between">
                      <span>Produk</span>
                      <button
                        type="button"
                        onClick={() => setProdModalOpen(true)}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center cursor-pointer"
                        title="Tambah Produk Baru"
                      >
                        <Plus className="w-3 h-3 mr-0.5" /> + Baru
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="w-[200px] font-bold text-foreground">Deskripsi</TableHead>
                  <TableHead className="w-[100px] font-bold text-foreground text-center">Kuantitas</TableHead>
                  <TableHead className="w-[100px] font-bold text-foreground">Unit</TableHead>
                  <TableHead className="w-[150px] font-bold text-foreground text-right">Harga Satuan</TableHead>
                  <TableHead className="w-[100px] font-bold text-foreground text-center">Diskon %</TableHead>
                  <TableHead className="w-[140px] font-bold text-foreground text-center">Pajak</TableHead>
                  <TableHead className="w-[160px] font-bold text-foreground text-right">Jumlah</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    {/* Produk */}
                    <TableCell className="p-2">
                      <Select 
                        value={item.product_id} 
                        onValueChange={(v) => handleItemChange(index, "product_id", v)}
                      >
                        <SelectTrigger className="h-9 bg-background border-border text-xs">
                          <SelectValue placeholder="Pilih produk..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Deskripsi */}
                    <TableCell className="p-2">
                      <Input 
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Deskripsi item..."
                        className="h-9 bg-background border-border text-xs"
                      />
                    </TableCell>

                    {/* Kuantitas */}
                    <TableCell className="p-2 text-center">
                      <Input 
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                        className="h-9 bg-background border-border text-center text-xs font-semibold"
                      />
                    </TableCell>

                    {/* Unit */}
                    <TableCell className="p-2">
                      <Input 
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                        className="h-9 bg-background border-border text-xs"
                        placeholder="Pcs"
                      />
                    </TableCell>

                    {/* Harga Satuan */}
                    <TableCell className="p-2 text-right">
                      <Input 
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, "price", e.target.value)}
                        className="h-9 bg-background border-border text-right text-xs font-semibold"
                      />
                    </TableCell>

                    {/* Diskon % */}
                    <TableCell className="p-2 text-center">
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_percent}
                        onChange={(e) => handleItemChange(index, "discount_percent", e.target.value)}
                        className="h-9 bg-background border-border text-center text-xs"
                      />
                    </TableCell>

                    {/* Pajak % */}
                    <TableCell className="p-2">
                      <Select
                        value={item.tax_percent === 0 ? "0" : String(item.tax_percent)}
                        onValueChange={(val) => {
                          if (val === "NEW_TAX") {
                            setActiveItemTaxIndex(index);
                            setTaxModalOpen(true);
                          } else {
                            handleItemChange(index, "tax_percent", parseFloat(val || "0") || 0);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 bg-background border-border text-xs w-full">
                          <SelectValue placeholder="Pilih pajak" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {availableTaxes.map((t) => (
                            <SelectItem key={t.id} value={String(t.rate)} className="cursor-pointer py-2 text-xs">
                              <div className="flex flex-col">
                                <span className="font-semibold">{t.name}</span>
                                <span className="text-[10px] text-muted-foreground">{t.rate}%</span>
                              </div>
                            </SelectItem>
                          ))}
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveItemTaxIndex(index);
                              setTaxModalOpen(true);
                            }}
                            className="p-2 text-xs text-indigo-600 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer border-t border-border flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah pajak baru
                          </div>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Jumlah */}
                    <TableCell className="p-2 text-right font-bold text-xs text-foreground">
                      {formatCurrency(item.total)}
                    </TableCell>

                    {/* Remove */}
                    <TableCell className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={items.length === 1}
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Add Row Button */}
            <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Tambah Baris
              </Button>
            </div>
          </div>

          {/* Bottom Grid: Left (Pesan, Memo, Lampiran) & Right (Subtotal & Total calculation) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Left Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Pesan</Label>
                <Textarea 
                  placeholder="Ketik pesan atau catatan untuk pelanggan..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="bg-background border-border text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Memo Internal</Label>
                <Textarea 
                  placeholder="Catatan internal yang tidak terlihat di penawaran cetak..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={2}
                  className="bg-background border-border text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  Lampiran
                </Label>
                <div className="border border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/30 cursor-pointer transition-colors">
                  <p className="text-xs text-muted-foreground">Seret dan lepas file di sini, atau telusuri file</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">Ukuran maks: 10MB (PDF, PNG, JPG)</p>
                </div>
              </div>
            </div>

            {/* Right Summary Calculations */}
            <div className="bg-muted/20 border border-border rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              {lineDiscountTotal > 0 && (
                <div className="flex justify-between items-center text-sm text-emerald-600">
                  <span>Diskon Per Baris</span>
                  <span className="font-semibold">- {formatCurrency(lineDiscountTotal)}</span>
                </div>
              )}

              {/* Global Discount Input */}
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Diskon Tambahan</span>
                  <div className="flex border border-border rounded-md overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-2 py-1 ${discountType === "percent" ? "bg-indigo-600 text-white font-bold" : "bg-background text-muted-foreground"}`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("amount")}
                      className={`px-2 py-1 ${discountType === "amount" ? "bg-indigo-600 text-white font-bold" : "bg-background text-muted-foreground"}`}
                    >
                      Rp
                    </button>
                  </div>
                </div>
                <div className="w-32">
                  <Input 
                    type="number"
                    min="0"
                    value={globalDiscountVal}
                    onChange={(e) => setGlobalDiscountVal(Number(e.target.value) || 0)}
                    className="h-8 text-right bg-background border-border text-xs"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-xl font-black text-indigo-600">
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-muted-foreground pt-1 border-t border-border/50">
                <span>Sisa Tagihan</span>
                <span className="font-bold text-foreground">{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Batalkan, Simpan Draf, Buat dan Kirim */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/sales")}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Batalkan
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit("DRAFT")}
              disabled={submitting}
              className="w-full sm:w-auto font-medium"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan Draf
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit("SENT")}
              disabled={submitting}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Buat & Kirim Penawaran
            </Button>
          </div>

        </CardContent>
      </Card>
    
      {/* Quick Add Modals */}
      <QuickAddCustomerModal 
        open={custModalOpen} 
        onOpenChange={setCustModalOpen}
        onSuccess={(newCust) => {
          setCustomers(prev => [newCust, ...prev]);
          handleCustomerChange(newCust.id);
        }}
      />
      <QuickAddProductModal
        open={prodModalOpen}
        onOpenChange={setProdModalOpen}
        onSuccess={(newProd) => {
          setProducts(prev => [newProd, ...prev]);
          if (items.length > 0 && !items[0].product_id) {
            handleItemChange(0, "product_id", newProd.id);
          }
        }}
      />
      <QuickAddTaxModal
        open={taxModalOpen}
        onOpenChange={setTaxModalOpen}
        onSuccess={(newTax) => {
          setAvailableTaxes(prev => [...prev, newTax]);
          if (activeItemTaxIndex !== null) {
            handleItemChange(activeItemTaxIndex, "tax_percent", newTax.rate);
            setActiveItemTaxIndex(null);
          }
        }}
      />
    </div>
  );
}