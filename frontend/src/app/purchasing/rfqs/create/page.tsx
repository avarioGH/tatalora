"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"
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
import { 
  Plus, Trash2, ArrowLeft, Save, Paperclip, FileText, HelpCircle, FileCheck, ChevronDown
} from "lucide-react"
import { api, B2BApi, InventoryAPI } from "@/lib/api"

export default function CreateRFQPage() {
  const router = useRouter()
  const todayStr = new Date().toISOString().split("T")[0]
  const expDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    supplierId: "",
    rfqNumber: `RFQ-${Date.now().toString().slice(-6)}`,
    transactionDate: todayStr,
    expirationDate: expDateStr,
    paymentTerms: "net30",
    reference: "",
    notes: ""
  })

  const [items, setItems] = useState<any[]>([
    { id: 1, productId: "", desc: "", qty: 1, unit: "Pcs", discount_percent: 0, price: 0, tax_percent: 0, total: 0 }
  ])

  useEffect(() => {
    async function loadMaster() {
      try {
        const [supRes, prodRes] = await Promise.all([
          api.get("/crm/partners").catch(() => ({ data: [] })),
          InventoryAPI.getProducts().catch(() => [])
        ])
        const rawSuppliers = (supRes?.data?.data || supRes?.data || (Array.isArray(supRes) ? supRes : [])).filter((s: any) => 
          !s.type || s.type === 'vendor' || s.type === 'supplier' || s.type === 'both'
        )
        const rawProducts = prodRes?.data || (Array.isArray(prodRes) ? prodRes : [])
        setSuppliers(rawSuppliers)
        setProducts(rawProducts)
      } catch (err) {
        console.error("Failed to load RFQ master data:", err)
      }
    }
    loadMaster()
  }, [])

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: value }

    if (field === "productId") {
      const prod = products.find(p => p.id === value)
      if (prod) {
        item.desc = prod.name || ""
        item.price = Number(prod.purchase_price || prod.cost_price || 0)
        item.unit = typeof prod.unit === 'object' && prod.unit !== null ? (prod.unit.name || "Pcs") : (prod.unit || "Pcs")
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
      { id: Date.now(), productId: "", desc: "", qty: 1, unit: "Pcs", discount_percent: 0, price: 0, tax_percent: 0, total: 0 }
    ])
  }

  const removeRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const subtotal = items.reduce((sum, it) => {
    const gross = (Number(it.qty) || 0) * (Number(it.price) || 0)
    const disc = (gross * (Number(it.discount_percent) || 0)) / 100
    return sum + Math.max(0, gross - disc)
  }, 0)

  const taxTotal = items.reduce((sum, it) => {
    const gross = (Number(it.qty) || 0) * (Number(it.price) || 0)
    const disc = (gross * (Number(it.discount_percent) || 0)) / 100
    const base = Math.max(0, gross - disc)
    return sum + ((base * (Number(it.tax_percent) || 0)) / 100)
  }, 0)

  const total = subtotal + taxTotal

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0)
  }

  const handleSave = async () => {
    if (!form.supplierId) {
      alert("Pilih supplier terlebih dahulu!")
      return
    }
    const validItems = items.filter(it => it.productId || it.desc)
    if (validItems.length === 0) {
      alert("Tambahkan minimal 1 item produk!")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        partner_id: form.supplierId,
        rfq_number: form.rfqNumber,
        date: form.transactionDate,
        due_date: form.expirationDate,
        payment_terms: form.paymentTerms,
        notes: form.notes,
        subtotal,
        tax: taxTotal,
        total_amount: total,
        status: "DRAFT",
        items: validItems.map(it => ({
          product_id: it.productId || undefined,
          description: it.desc,
          quantity: Number(it.qty),
          unit: it.unit,
          unit_price: Number(it.price),
          discount: (Number(it.qty) * Number(it.price) * Number(it.discount_percent || 0)) / 100,
          total: it.total
        }))
      }

      await api.post("/purchasing/rfqs", payload).catch(async () => {
        // Fallback endpoint
        await api.post("/purchasing/requests", payload)
      })

      alert("Penawaran Pembelian (RFQ) berhasil disimpan!")
      router.push("/purchasing")
    } catch (err: any) {
      console.error(err)
      alert("Gagal menyimpan RFQ: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-2 cursor-pointer hover:text-foreground transition-colors w-fit" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Kembali</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileCheck className="h-6 w-6 text-blue-600" />
            </div>
            Tambah Penawaran Pembelian (RFQ)
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border" onClick={() => router.back()}>Batal</Button>
          <Button variant="outline" className="w-full sm:w-auto bg-card text-foreground border-border gap-2">
            <HelpCircle className="w-4 h-4" /> Panduan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Main Form) */}
        <div className="xl:col-span-2 space-y-6">
          
          <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Informasi Dokumen Penawaran
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-foreground">Supplier / Vendor <span className="text-rose-500">*</span></Label>
                  <Select value={form.supplierId} onValueChange={(val) => setForm({...form, supplierId: val || ""})}>
                    <SelectTrigger className="bg-background border-border font-medium">
                      <SelectValue placeholder="Pilih supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.company_name ? `(${s.company_name})` : ""}
                        </SelectItem>
                      ))}
                      {suppliers.length === 0 && (
                        <SelectItem value="none" disabled>Belum ada kontak supplier</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-foreground text-xs flex items-center justify-between">
                    <span>Nomor Transaksi</span>
                  </Label>
                  <Input 
                    value={form.rfqNumber} 
                    onChange={(e) => setForm({...form, rfqNumber: e.target.value})}
                    className="bg-background border-border font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Tgl. Transaksi <span className="text-rose-500">*</span></Label>
                  <Input 
                    type="date" 
                    value={form.transactionDate} 
                    onChange={(e) => setForm({...form, transactionDate: e.target.value})}
                    className="bg-background border-border" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Kadaluarsa</Label>
                  <Input 
                    type="date" 
                    value={form.expirationDate} 
                    onChange={(e) => setForm({...form, expirationDate: e.target.value})}
                    className="bg-background border-border" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Syarat Pembayaran (Termin)</Label>
                  <Select value={form.paymentTerms} onValueChange={(val) => setForm({...form, paymentTerms: val || "net30"})}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Pilih termin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">COD (Bayar Tunai)</SelectItem>
                      <SelectItem value="net15">Net 15 Hari</SelectItem>
                      <SelectItem value="net30">Net 30 Hari</SelectItem>
                      <SelectItem value="net60">Net 60 Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <Label className="text-foreground text-xs">Referensi Internal / Vendor</Label>
                <Input 
                  placeholder="Misal: Nomor katalog vendor, penawaran harga vendor..." 
                  value={form.reference}
                  onChange={(e) => setForm({...form, reference: e.target.value})}
                  className="bg-background border-border" 
                />
              </div>

            </CardContent>
          </Card>

          {/* Section 2: Items Table */}
          <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg flex items-center justify-between text-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Rincian Produk
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 border-b border-border hover:bg-transparent">
                      <TableHead className="min-w-[200px] text-foreground font-semibold">Produk</TableHead>
                      <TableHead className="min-w-[150px] text-foreground font-semibold">Deskripsi</TableHead>
                      <TableHead className="w-20 text-center text-foreground font-semibold">Kuantitas</TableHead>
                      <TableHead className="w-24 text-foreground font-semibold">Unit</TableHead>
                      <TableHead className="w-24 text-center text-foreground font-semibold">Diskon %</TableHead>
                      <TableHead className="min-w-[140px] text-right text-foreground font-semibold">Harga Satuan</TableHead>
                      <TableHead className="w-28 text-center text-foreground font-semibold">Pajak</TableHead>
                      <TableHead className="min-w-[140px] text-right text-foreground font-semibold">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id} className="border-b border-border hover:bg-muted/10 group">
                        <TableCell className="align-top pt-4">
                          <Select 
                            value={item.productId} 
                            onValueChange={(val) => handleItemChange(index, "productId", val || "")}
                          >
                            <SelectTrigger className="bg-background border-border">
                              <SelectValue placeholder="Pilih Produk" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.code ? `[${p.code}] ` : ""}{p.name}
                                </SelectItem>
                              ))}
                              {products.length === 0 && (
                                <SelectItem value="none" disabled>Belum ada produk</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input 
                            value={item.desc}
                            onChange={(e) => handleItemChange(index, "desc", e.target.value)}
                            placeholder="Keterangan..." 
                            className="bg-background border-border" 
                          />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input 
                            type="number" 
                            value={item.qty} 
                            min="1" 
                            onChange={(e) => handleItemChange(index, "qty", Number(e.target.value) || 0)}
                            className="bg-background border-border text-center" 
                          />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input 
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                            className="bg-background border-border text-center" 
                          />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount_percent}
                            onChange={(e) => handleItemChange(index, "discount_percent", Number(e.target.value) || 0)}
                            className="bg-background border-border text-center" 
                          />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Input 
                            type="number" 
                            placeholder="0" 
                            value={item.price}
                            onChange={(e) => handleItemChange(index, "price", Number(e.target.value) || 0)}
                            className="bg-background border-border text-right font-medium" 
                          />
                        </TableCell>
                        <TableCell className="align-top pt-4">
                          <Select 
                            value={item.tax_percent === 0 ? "0" : String(item.tax_percent)}
                            onValueChange={(val) => handleItemChange(index, "tax_percent", parseFloat(val || "0") || 0)}
                          >
                            <SelectTrigger className="bg-background border-border text-muted-foreground text-xs">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="11">PPN 11%</SelectItem>
                              <SelectItem value="12">PPN 12%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top pt-4 text-right font-semibold text-sm">
                          {formatIDR(item.total)}
                        </TableCell>
                        <TableCell className="align-top pt-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeRow(item.id)}
                            className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-border bg-muted/20">
                <Button variant="outline" onClick={addRow} className="gap-2 bg-card text-blue-600 border-border hover:bg-blue-500/10 hover:border-blue-500/30 w-full sm:w-auto justify-center">
                  <Plus className="h-4 w-4" /> Tambah baris
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Notes */}
          <Card className="border-0 shadow-sm ring-1 ring-border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Catatan Penawaran
              </span>
            </div>
            <CardContent className="p-4">
              <Textarea 
                value={form.notes}
                onChange={(e) => setForm({...form, notes: e.target.value})}
                placeholder="Tuliskan pesan atau catatan untuk penawaran ini..." 
                className="resize-none h-24 border-border bg-background" 
              />
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Summary) */}
        <div className="xl:col-span-1">
          <Card className="border-0 shadow-sm ring-1 ring-border sticky top-6 bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg text-foreground">Ringkasan Penawaran</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Sub Total</span>
                <span className="font-semibold text-foreground">{formatIDR(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Pajak (PPN)</span>
                <span className="font-semibold text-foreground">{formatIDR(taxTotal)}</span>
              </div>
              
              <div className="pt-4 mt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total Penawaran</span>
                  <span className="text-lg font-bold text-blue-600">{formatIDR(total)}</span>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  onClick={handleSave}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all py-6 text-base font-semibold gap-2"
                >
                  <Save className="w-5 h-5" />
                  {submitting ? "Menyimpan..." : "Simpan Penawaran"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  )
}
