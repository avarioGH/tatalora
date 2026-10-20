"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
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
import { 
  Plus, Trash2, ArrowLeft, ArrowLeftRight, Paperclip, Loader2
} from "lucide-react"

export default function CreateInvoiceExchangePage() {
  const router = useRouter()

  // Master Data
  const [customers, setCustomers] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Header / Top Form State
  const [customerId, setCustomerId] = useState("")
  const [email, setEmail] = useState("")
  const [billingAddress, setBillingAddress] = useState("")
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [dueDate, setDueDate] = useState("")
  const [transactionNo, setTransactionNo] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("net30")

  // Selected Invoices Table
  // { id, invoice_id, invoice_number, description, due_date, status, invoice_amount, remaining_amount }
  const [items, setItems] = useState<any[]>([
    {
      id: "item-1",
      invoice_id: "",
      invoice_number: "",
      description: "",
      due_date: "",
      status: "",
      invoice_amount: 0,
      remaining_amount: 0
    }
  ])

  // Bottom State
  const [message, setMessage] = useState("")
  const [memo, setMemo] = useState("")

  // Load Customers
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const res = await api.get("/customers").catch(() => ({ data: [] }))
        setCustomers(res.data?.data || res.data || [])
      } catch (e) {
        console.error("Error fetching customers:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  // When customer changes, populate details and fetch their unpaid invoices
  const handleCustomerChange = async (cId: string) => {
    setCustomerId(cId)
    const found = customers.find(c => c.id === cId)
    if (found) {
      setEmail(found.email || "")
      setBillingAddress(found.address || "")
    }

    // Fetch invoices for this customer
    try {
      const res = await api.get("/finance/invoices").catch(() => ({ data: { data: [] } }))
      const allInvoices = res.data?.data || res.data || []
      // Filter by customer and unpaid/draft/posted
      const custInvoices = allInvoices.filter(
        (inv: any) => inv.customer_id === cId || !cId
      )
      setInvoices(custInvoices)
    } catch (e) {
      console.error("Failed to load customer invoices", e)
    }
  }

  // Handle Payment Terms change -> recalculate due date
  const handlePaymentTermsChange = (term: string) => {
    setPaymentTerms(term)
    const baseDate = new Date(transactionDate)
    let days = 30
    if (term === "cod") days = 0
    else if (term === "net15") days = 15
    else if (term === "net30") days = 30
    else if (term === "net60") days = 60
    
    baseDate.setDate(baseDate.getDate() + days)
    setDueDate(baseDate.toISOString().split("T")[0])
  }

  // Handle Invoice Row selection
  const handleInvoiceSelect = (index: number, invId: string) => {
    const selectedInv = invoices.find(inv => inv.id === invId)
    const updated = [...items]
    if (selectedInv) {
      updated[index] = {
        ...updated[index],
        invoice_id: selectedInv.id,
        invoice_number: selectedInv.invoice_number,
        description: `Penagihan #${selectedInv.invoice_number}`,
        due_date: selectedInv.due_date ? new Date(selectedInv.due_date).toISOString().split("T")[0] : "",
        status: selectedInv.status,
        invoice_amount: Number(selectedInv.total || 0),
        remaining_amount: Number(selectedInv.remaining_amount || selectedInv.total || 0)
      }
    } else {
      updated[index] = {
        ...updated[index],
        invoice_id: "",
        invoice_number: "",
        description: "",
        due_date: "",
        status: "",
        invoice_amount: 0,
        remaining_amount: 0
      }
    }
    setItems(updated)
  }

  const addRow = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        invoice_id: "",
        invoice_number: "",
        description: "",
        due_date: "",
        status: "",
        invoice_amount: 0,
        remaining_amount: 0
      }
    ])
  }

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // Total Calculation
  const totalSisaTagihan = items.reduce((acc, it) => acc + (Number(it.remaining_amount) || 0), 0)

  // Format IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2
    }).format(val || 0)
  }

  // Submit Tukar Faktur
  const handleSubmit = async (shouldPost: boolean = false) => {
    if (!customerId) {
      alert("Pilih pelanggan terlebih dahulu!")
      return
    }

    const validItems = items.filter(it => it.invoice_id)
    if (validItems.length === 0) {
      alert("Pilih minimal 1 faktur/penagihan untuk ditukar!")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customer_id: customerId,
        email,
        billing_address: billingAddress,
        transaction_no: transactionNo || undefined,
        transaction_date: transactionDate,
        due_date: dueDate || undefined,
        payment_terms: paymentTerms,
        message,
        memo,
        total_amount: totalSisaTagihan,
        status: shouldPost ? "POSTED" : "DRAFT",
        items: validItems.map(it => ({
          invoice_id: it.invoice_id,
          description: it.description,
          due_date: it.due_date ? new Date(it.due_date) : null,
          status: it.status,
          invoice_amount: Number(it.invoice_amount),
          remaining_amount: Number(it.remaining_amount)
        }))
      }

      await api.post("/finance/invoice-exchanges", payload)
      alert("Tukar Faktur Penjualan berhasil dibuat!")
      router.push("/sales")
    } catch (err: any) {
      console.error(err)
      alert("Gagal membuat tukar faktur: " + (err.response?.data?.message || err.message))
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
              <ArrowLeftRight className="w-6 h-6 text-indigo-600" />
              Tukar Faktur Penjualan
            </h1>
          </div>
        </div>

        {/* Real-time Total Indicator Header */}
        <div className="text-right flex flex-col items-end">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Sisa Tagihan</span>
          <span className="text-3xl font-extrabold text-indigo-600">
            {formatIDR(totalSisaTagihan)}
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
                  <SelectValue placeholder="Pilih pelanggan" />
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

          {/* Baris 2: Alamat Penagihan, Tgl Transaksi, No Transaksi, Tgl Jatuh Tempo, Syarat Pembayaran */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Alamat penagihan</Label>
              <Textarea 
                placeholder="e.g. Jalan Indonesia Blok C No. 22" 
                value={billingAddress} 
                onChange={(e) => setBillingAddress(e.target.value)}
                className="bg-background border-border resize-none h-[116px]"
              />
            </div>

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
                <Label className="text-sm font-semibold flex items-center gap-1">
                  Tgl. jatuh tempo <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-background border-border h-10"
                />
              </div>
            </div>

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
                    <SelectValue placeholder="Pilih syarat pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">COD (Bayar Langsung)</SelectItem>
                    <SelectItem value="net15">Net 15</SelectItem>
                    <SelectItem value="net30">Net 30</SelectItem>
                    <SelectItem value="net60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tabel Penagihan Penjualan (Penagihan Penjualan, Deskripsi, Tgl. jatuh tempo, Status, Jumlah tagihan, Sisa tagihan) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-base font-bold">Daftar Faktur / Penagihan Ditukar</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addRow} 
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Plus className="w-4 h-4 mr-1" /> Tambah Baris Faktur
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-x-auto shadow-sm">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[300px]">Penagihan Penjualan <span className="text-rose-500">*</span></TableHead>
                    <TableHead className="min-w-[200px]">Deskripsi</TableHead>
                    <TableHead className="w-[140px] text-center">Tgl. jatuh tempo</TableHead>
                    <TableHead className="w-[120px] text-center">Status</TableHead>
                    <TableHead className="w-[160px] text-right">Jumlah tagihan</TableHead>
                    <TableHead className="w-[160px] text-right">Sisa tagihan</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="p-2">
                        <Select 
                          value={row.invoice_id} 
                          onValueChange={(v) => handleInvoiceSelect(index, v)}
                        >
                          <SelectTrigger className="h-9 bg-background border-border text-xs">
                            <SelectValue placeholder="Cari atau pilih faktur..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {invoices.map((inv: any) => (
                              <SelectItem key={inv.id} value={inv.id}>
                                {inv.invoice_number} — Sisa: {formatIDR(inv.remaining_amount || inv.total || 0)}
                              </SelectItem>
                            ))}
                            {invoices.length === 0 && (
                              <SelectItem value="none" disabled>
                                {customerId ? "Tidak ada tagihan tertunggak" : "Pilih pelanggan dahulu"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="p-2">
                        <Input 
                          value={row.description} 
                          onChange={(e) => {
                            const updated = [...items]
                            updated[index].description = e.target.value
                            setItems(updated)
                          }}
                          placeholder="Deskripsi..." 
                          className="h-9 bg-background border-border text-xs"
                        />
                      </TableCell>

                      <TableCell className="p-2 text-center text-xs text-muted-foreground font-medium">
                        {row.due_date ? new Date(row.due_date).toLocaleDateString("id-ID") : "-"}
                      </TableCell>

                      <TableCell className="p-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          row.status === "PAID" 
                            ? "bg-emerald-500/10 text-emerald-600" 
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {row.status || "-"}
                        </span>
                      </TableCell>

                      <TableCell className="p-2 text-right font-medium text-xs">
                        {formatIDR(row.invoice_amount)}
                      </TableCell>

                      <TableCell className="p-2 text-right font-semibold text-sm text-indigo-600">
                        {formatIDR(row.remaining_amount)}
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

          {/* Bagian Bawah: Pesan, Memo, Lampiran di Kiri VS Total Sisa Tagihan di Kanan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/60">
            
            {/* Kiri: Pesan, Memo, Lampiran */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Pesan</Label>
                <Textarea 
                  placeholder="Pesan untuk tanda terima tukar faktur..." 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-background border-border resize-none h-20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Memo (Internal)</Label>
                <Textarea 
                  placeholder="Catatan memo internal..." 
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

            {/* Kanan: Ringkasan Total Sisa Tagihan */}
            <div className="flex flex-col justify-between p-6 rounded-xl border border-border bg-muted/20">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ringkasan Dokumen</h3>
                <div className="flex justify-between items-center py-2 border-b border-border/60">
                  <span className="text-sm text-muted-foreground font-medium">Jumlah Faktur Ditukar</span>
                  <span className="text-sm font-bold text-foreground">
                    {items.filter(it => it.invoice_id).length} Dokumen
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-indigo-600/30 flex justify-between items-center mt-6">
                <span className="text-base font-bold text-foreground">Total sisa tagihan</span>
                <span className="text-3xl font-black text-indigo-600">
                  {formatIDR(totalSisaTagihan)}
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
