"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { 
  Plus, Trash2, ArrowLeft, Receipt, ChevronDown, Paperclip, Loader2, Sparkles
} from "lucide-react"

export default function CreateSalesInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quotation_id = searchParams.get("quotation_id")
  const so_id = searchParams.get("so_id")

  // Master Data
  const [customers, setCustomers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
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
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [paymentTerms, setPaymentTerms] = useState("net30")
  const [transactionNo, setTransactionNo] = useState("")
  const [clientRef, setClientRef] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [tag, setTag] = useState("")
  const [currency, setCurrency] = useState("IDR")
  const [taxInclusive, setTaxInclusive] = useState(false)

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
  const [hasDeduction, setHasDeduction] = useState(false)

  // Load Initial Master Data
  useEffect(() => {
    const fetchMaster = async () => {
      setLoading(true)
      try {
        const [cRes, wRes, pRes] = await Promise.all([
          api.get("/customers").catch(() => ({ data: [] })),
          api.get("/inventory/warehouses").catch(() => ({ data: [] })),
          api.get("/inventory/products").catch(() => ({ data: [] }))
        ])
        const custList = cRes.data?.data || cRes.data || []
        const whList = wRes.data?.data || wRes.data || []
        const prodList = pRes.data?.data || pRes.data || []
        setCustomers(custList)
        setWarehouses(whList)
        setProducts(prodList)

        if (whList.length > 0 && !warehouseId) {
          setWarehouseId(whList[0].id)
        }
      } catch (e) {
        console.error("Error fetching master data:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMaster()
  }, [])

  // Auto-fill from Quotation or Sales Order
  useEffect(() => {
    if (quotation_id) {
      B2BApi.getQuotation(quotation_id).then((q: any) => {
        if (q) {
          setCustomerId(q.customer_id || "")
          if (q.items && q.items.length > 0) {
            setItems(
              q.items.map((it: any, idx: number) => ({
                id: `q-item-${idx}`,
                product_id: it.product_id,
                description: it.description || "",
                qty: it.qty || 1,
                unit: it.unit || "Pcs",
                price: it.unit_price || 0,
                discount_percent: 0,
                tax_percent: 0,
                total: (it.qty || 1) * (it.unit_price || 0)
              }))
            )
          }
        }
      }).catch(console.error)
    } else if (so_id) {
      B2BApi.getOrder(so_id).then((o: any) => {
        if (o) {
          setCustomerId(o.customer_id || "")
          setClientRef(o.order_number || "")
          if (o.items && o.items.length > 0) {
            setItems(
              o.items.map((it: any, idx: number) => ({
                id: `so-item-${idx}`,
                product_id: it.product_id,
                description: it.description || "",
                qty: it.qty || 1,
                unit: it.unit || "Pcs",
                price: it.unit_price || 0,
                discount_percent: 0,
                tax_percent: 0,
                total: (it.qty || 1) * (it.unit_price || 0)
              }))
            )
          }
        }
      }).catch(console.error)
    }
  }, [quotation_id, so_id])

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

  // When payment terms change, recalculate due date
  const handlePaymentTermsChange = (term: string | null) => {
    const validTerm = term || "net30"
    setPaymentTerms(validTerm)
    const baseDate = new Date(transactionDate)
    let days = 30
    if (term === "cod") days = 0
    else if (term === "net15") days = 15
    else if (term === "net30") days = 30
    else if (term === "net60") days = 60
    
    baseDate.setDate(baseDate.getDate() + days)
    setDueDate(baseDate.toISOString().split("T")[0])
  }

  // Handle Item Row change
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: value }

    if (field === "product_id") {
      const prod = products.find(p => p.id === value)
      if (prod) {
        item.description = prod.name || ""
        item.price = Number(prod.price || prod.sale_price || 0)
        item.unit = prod.unit?.name || prod.unit || "Pcs"
      }
    }

    const qty = Number(item.qty || 0)
    const price = Number(item.price || 0)
    const discPct = Number(item.discount_percent || 0)
    const gross = qty * price
    const lineDiscount = (gross * discPct) / 100
    item.total = Math.max(0, gross - lineDiscount)

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
  const subtotal = items.reduce((acc, it) => acc + (it.total || 0), 0)
  const lineDiscountTotal = items.reduce((acc, it) => {
    const gross = (Number(it.qty) || 0) * (Number(it.price) || 0)
    return acc + (gross * (Number(it.discount_percent) || 0) / 100)
  }, 0)

  const globalDiscount = discountType === "percent"
    ? (subtotal * Number(globalDiscountVal || 0)) / 100
    : Number(globalDiscountVal || 0)

  const total = Math.max(0, subtotal - globalDiscount)
  const balanceDue = total

  // Format Rupiah
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  // Save / Submit Invoice
  const handleSubmit = async (shouldPost: boolean = false) => {
    if (!customerId) {
      alert("Pilih pelanggan terlebih dahulu!")
      return
    }

    const validItems = items.filter(it => it.product_id)
    if (validItems.length === 0) {
      alert("Masukkan minimal 1 produk pada rincian barang!")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customer_id: customerId,
        sales_order_id: so_id || undefined,
        email,
        billing_address: billingAddress,
        payment_terms: paymentTerms,
        invoice_number: transactionNo || undefined,
        invoice_date: transactionDate,
        due_date: dueDate,
        warehouse_id: warehouseId || undefined,
        tag,
        client_ref: clientRef,
        message,
        memo,
        currency,
        subtotal,
        discount_percent: discountType === "percent" ? globalDiscountVal : 0,
        discount_amount: globalDiscount,
        total,
        status: shouldPost ? "POSTED" : "DRAFT",
        items: validItems.map(it => ({
          product_id: it.product_id,
          description: it.description,
          qty: Number(it.qty),
          unit_price: Number(it.price),
          discount: (Number(it.qty) * Number(it.price) * (Number(it.discount_percent) || 0)) / 100,
          tax: 0,
          subtotal: it.total
        }))
      }

      const res = await api.post("/finance/invoices", payload)
      if (shouldPost && res.data?.id) {
        await api.post(`/finance/invoices/${res.data.id}/post`).catch(console.error)
      }

      alert("Penagihan Penjualan berhasil dibuat!")
      router.push("/sales")
    } catch (err: any) {
      console.error(err)
      alert("Gagal membuat penagihan: " + (err.response?.data?.message || err.message))
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-indigo-600" />
              Buat Penagihan Penjualan
            </h1>
            <p className="text-sm text-muted-foreground">
              Catat tagihan invoice penjualan baru langsung ke pelanggan
            </p>
          </div>
        </div>

        {/* Real-time Total Indicator Header */}
        <div className="text-right flex flex-col items-end">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Tagihan</span>
          <span className="text-3xl font-extrabold text-indigo-600">
            {formatIDR(total)}
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-8">
          
          {/* Baris 1: Pelanggan & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1">
                Pelanggan <span className="text-rose-500">*</span>
              </Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger className="bg-background border-border h-10">
                  <SelectValue placeholder="Pilih Pelanggan..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                  {customers.length === 0 && (
                    <SelectItem value="empty" disabled>
                      {loading ? "Memuat pelanggan..." : "Belum ada pelanggan"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email</Label>
              <Input 
                type="email" 
                placeholder="Enter email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border h-10"
              />
            </div>
          </div>

          {/* Baris 2: Alamat Penagihan, Tgl Transaksi, No Transaksi, Tag */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2 md:col-span-1">
              <Label className="text-sm font-semibold">Alamat penagihan</Label>
              <Textarea 
                placeholder="e.g. Jalan Indonesia Blok C No. 22" 
                value={billingAddress} 
                onChange={(e) => setBillingAddress(e.target.value)}
                className="bg-background border-border resize-none h-[116px]"
              />
            </div>

            <div className="space-y-4 md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Kolom 1 dari 3 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tgl. transaksi</Label>
                  <Input 
                    type="date" 
                    value={transactionDate} 
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="bg-background border-border h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tgl. jatuh tempo</Label>
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-background border-border h-10"
                  />
                </div>
              </div>

              {/* Kolom 2 dari 3 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">No Transaksi</Label>
                  <Input 
                    placeholder="[Auto]" 
                    value={transactionNo} 
                    onChange={(e) => setTransactionNo(e.target.value)}
                    className="bg-background border-border h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Syarat pembayaran</Label>
                  <Select value={paymentTerms} onValueChange={handlePaymentTermsChange}>
                    <SelectTrigger className="bg-background border-border h-10">
                      <SelectValue placeholder="Pilih Termin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">COD (Bayar Langsung)</SelectItem>
                      <SelectItem value="net15">Net 15 Hari</SelectItem>
                      <SelectItem value="net30">Net 30 Hari</SelectItem>
                      <SelectItem value="net60">Net 60 Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Kolom 3 dari 3 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tag</Label>
                  <Input 
                    placeholder="Pilih tag..." 
                    value={tag} 
                    onChange={(e) => setTag(e.target.value)}
                    className="bg-background border-border h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Gudang</Label>
                  <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val || "")}>
                    <SelectTrigger className="bg-background border-border h-10">
                      <SelectValue placeholder="Pilih gudang..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.code || "WH"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Baris 3: Mata Uang & No Referensi Pelanggan */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Mata uang</Label>
              <Select value={currency} onValueChange={(val) => setCurrency(val || "IDR")}>
                <SelectTrigger className="bg-background border-border h-10">
                  <SelectValue placeholder="Pilih Mata Uang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR (Rupiah Indonesia)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold">No. referensi pelanggan</Label>
              <Input 
                placeholder="Contoh: PO-CUST-2026-001" 
                value={clientRef} 
                onChange={(e) => setClientRef(e.target.value)}
                className="bg-background border-border h-10"
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox 
                id="tax_inc" 
                checked={taxInclusive} 
                onCheckedChange={(checked) => setTaxInclusive(!!checked)} 
              />
              <label 
                htmlFor="tax_inc" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Harga termasuk pajak
              </label>
            </div>
          </div>

          {/* Tabel Rincian Barang (Produk, Deskripsi, Kuantitas, Unit, Harga Satuan, Diskon %, Pajak %, Jumlah) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-base font-bold">Rincian Barang & Jasa</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addRow} 
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Plus className="w-4 h-4 mr-1" /> Tambah Baris
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-x-auto shadow-sm">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[280px]">Produk <span className="text-rose-500">*</span></TableHead>
                    <TableHead className="min-w-[180px]">Deskripsi</TableHead>
                    <TableHead className="w-[100px] text-center">Kuantitas</TableHead>
                    <TableHead className="w-[90px] text-center">Unit</TableHead>
                    <TableHead className="w-[150px] text-right">Harga satuan</TableHead>
                    <TableHead className="w-[110px] text-center">Diskon (%)</TableHead>
                    <TableHead className="w-[100px] text-center">Pajak</TableHead>
                    <TableHead className="w-[160px] text-right">Jumlah</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="p-2">
                        <Select 
                          value={row.product_id} 
                          onValueChange={(v) => handleItemChange(index, "product_id", v)}
                        >
                          <SelectTrigger className="h-9 bg-background border-border text-xs">
                            <SelectValue placeholder="Pilih produk..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {products.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.code ? `[${p.code}] ` : ""}{p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="p-2">
                        <Input 
                          value={row.description} 
                          onChange={(e) => handleItemChange(index, "description", e.target.value)} 
                          placeholder="Deskripsi..." 
                          className="h-9 bg-background border-border text-xs"
                        />
                      </TableCell>

                      <TableCell className="p-2 text-center">
                        <Input 
                          type="number" 
                          min="1" 
                          value={row.qty} 
                          onChange={(e) => handleItemChange(index, "qty", e.target.value)} 
                          className="h-9 bg-background border-border text-xs text-center"
                        />
                      </TableCell>

                      <TableCell className="p-2 text-center">
                        <Input 
                          value={row.unit} 
                          onChange={(e) => handleItemChange(index, "unit", e.target.value)} 
                          className="h-9 bg-background border-border text-xs text-center"
                        />
                      </TableCell>

                      <TableCell className="p-2 text-right">
                        <Input 
                          type="number" 
                          value={row.price} 
                          onChange={(e) => handleItemChange(index, "price", e.target.value)} 
                          className="h-9 bg-background border-border text-xs text-right"
                        />
                      </TableCell>

                      <TableCell className="p-2 text-center">
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={row.discount_percent} 
                          onChange={(e) => handleItemChange(index, "discount_percent", e.target.value)} 
                          className="h-9 bg-background border-border text-xs text-center"
                        />
                      </TableCell>

                      <TableCell className="p-2 text-center">
                        <Select defaultValue="none">
                          <SelectTrigger className="h-9 bg-background border-border text-xs">
                            <SelectValue placeholder="Pajak" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">0%</SelectItem>
                            <SelectItem value="ppn11">PPN 11%</SelectItem>
                            <SelectItem value="ppn12">PPN 12%</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="p-2 text-right font-semibold text-sm">
                        {formatIDR(row.total)}
                      </TableCell>

                      <TableCell className="p-2 text-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeRow(index)}
                          disabled={items.length === 1}
                          className="text-muted-foreground hover:text-rose-500 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bagian Bawah: Pesan, Memo, Lampiran di Kiri VS Subtotal & Diskon di Kanan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/60">
            
            {/* Kiri: Pesan, Memo, Lampiran */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Pesan</Label>
                <Textarea 
                  placeholder="Pesan untuk pelanggan yang dicetak pada invoice..." 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-background border-border resize-none h-20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Memo (Internal)</Label>
                <Textarea 
                  placeholder="Catatan memo internal (tidak terlihat oleh pelanggan)..." 
                  value={memo} 
                  onChange={(e) => setMemo(e.target.value)}
                  className="bg-background border-border resize-none h-20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Lampiran</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer bg-background">
                  <Paperclip className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-xs text-foreground font-medium">Choose file atau tarik & lepas file di sini</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    File dapat berupa Excel, Word, PDF, JPG, PNG, atau ZIP (maksimum 5 file dan 10 MB per file)
                  </p>
                </div>
              </div>
            </div>

            {/* Kanan: Ringkasan Finansial Sesuai Format Referensi */}
            <div className="space-y-4 bg-muted/20 p-6 rounded-xl border border-border">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground font-medium">Subtotal</span>
                <span className="text-base font-semibold">{formatIDR(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground font-medium">Diskon per baris</span>
                <span className="text-sm text-muted-foreground font-semibold">
                  {formatIDR(lineDiscountTotal)}
                </span>
              </div>

              {/* Diskon Global */}
              <div className="flex justify-between items-center gap-4 py-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Diskon</span>
                  <Select 
                    value={discountType} 
                    onValueChange={(v: any) => setDiscountType(v)}
                  >
                    <SelectTrigger className="w-20 h-8 bg-background border-border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="amount">Rp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={globalDiscountVal} 
                    onChange={(e) => setGlobalDiscountVal(Number(e.target.value) || 0)} 
                    className="w-24 h-8 bg-background border-border text-right text-xs"
                  />
                  <span className="text-sm font-semibold min-w-[100px] text-right">
                    {formatIDR(globalDiscount)}
                  </span>
                </div>
              </div>

              <div className="border-t border-border my-2 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{formatIDR(total)}</span>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <Checkbox 
                  id="pemotongan" 
                  checked={hasDeduction} 
                  onCheckedChange={(c) => setHasDeduction(!!c)} 
                />
                <label 
                  htmlFor="pemotongan" 
                  className="text-xs text-muted-foreground cursor-pointer font-medium"
                >
                  Pemotongan
                </label>
              </div>

              <div className="border-t-2 border-indigo-600/30 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-foreground">Sisa tagihan</span>
                <span className="text-2xl font-black text-indigo-600">
                  {formatIDR(balanceDue)}
                </span>
              </div>
            </div>

          </div>

          {/* Action Footer Buttons */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-6 border-t border-border">
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
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan Draf
            </Button>
            <Button 
              type="button" 
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Buat dan Terbitkan
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
