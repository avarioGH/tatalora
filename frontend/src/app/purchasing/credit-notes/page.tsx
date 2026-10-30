"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CreditCard, Search, Plus, ExternalLink, Loader2, ArrowRight, CheckCircle2,
  AlertCircle, RefreshCw, Undo2, Banknote, ShieldCheck
} from "lucide-react"
import { PurchasingAPI } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

export default function SupplierCreditNotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [creditNotes, setCreditNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Dialog state for Apply Credit
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<any>(null)
  const [targetBillId, setTargetBillId] = useState("")
  const [applyAmount, setApplyAmount] = useState<number>(0)
  const [applyNotes, setApplyNotes] = useState("")
  const [submittingApply, setSubmittingApply] = useState(false)

  // Dialog state for Refund
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundCashAccountId, setRefundCashAccountId] = useState("")
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [refundReference, setRefundReference] = useState("")
  const [submittingRefund, setSubmittingRefund] = useState(false)

  const tabs = ["Semua", "POSTED", "PARTIALLY_APPLIED", "FULLY_APPLIED", "REVERSED"]

  const fetchCredits = async () => {
    try {
      setLoading(true)
      const data = await PurchasingAPI.getSupplierCredits()
      setCreditNotes(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Gagal Mengambil Data",
        description: err.response?.data?.message || err.message || "Terjadi kesalahan saat memuat nota kredit",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredits()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FULLY_APPLIED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 font-medium px-2.5 py-0.5">Teralokasi Penuh</Badge>
      case "PARTIALLY_APPLIED":
        return <Badge className="bg-blue-500/10 text-blue-600 border-0 font-medium px-2.5 py-0.5">Teralokasi Sebagian</Badge>
      case "POSTED":
        return <Badge className="bg-purple-500/10 text-purple-600 border-0 font-medium px-2.5 py-0.5">Tersedia (Posted)</Badge>
      case "REVERSED":
        return <Badge className="bg-rose-500/10 text-rose-600 border-0 font-medium px-2.5 py-0.5">Dibatalkan (Reversed)</Badge>
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border-0 font-medium px-2.5 py-0.5">{status}</Badge>
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const filtered = creditNotes.filter((item) => {
    const matchSearch =
      item.credit_note_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.purchase_return?.return_number?.toLowerCase().includes(search.toLowerCase())

    if (activeTab === "Semua") return matchSearch
    return matchSearch && item.status === activeTab
  })

  const openApplyDialog = (credit: any) => {
    setSelectedCredit(credit)
    setApplyAmount(credit.remaining_credit || 0)
    setTargetBillId("")
    setApplyNotes("")
    setApplyModalOpen(true)
  }

  const handleApplyCredit = async () => {
    if (!selectedCredit || !targetBillId || applyAmount <= 0) {
      toast({ title: "Validasi Gagal", description: "Pilih Faktur Vendor Bill dan masukkan nominal alokasi yang valid", variant: "destructive" })
      return
    }

    try {
      setSubmittingApply(true)
      await PurchasingAPI.applySupplierCredit(selectedCredit.id, {
        vendorBillId: targetBillId,
        amount: Number(applyAmount),
        notes: applyNotes,
        idempotencyKey: `apply-${selectedCredit.id}-${targetBillId}-${Date.now()}`,
      })
      toast({ title: "Berhasil", description: "Supplier Credit Note berhasil dialokasikan ke tagihan vendor!" })
      setApplyModalOpen(false)
      fetchCredits()
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Gagal Alokasi",
        description: err.response?.data?.message || err.message || "Gagal menerapkan credit note",
        variant: "destructive",
      })
    } finally {
      setSubmittingApply(false)
    }
  }

  const openRefundDialog = (credit: any) => {
    setSelectedCredit(credit)
    setRefundAmount(credit.remaining_credit || 0)
    setRefundCashAccountId("")
    setRefundReference("")
    setRefundModalOpen(true)
  }

  const handleRefundCredit = async () => {
    if (!selectedCredit || !refundCashAccountId || refundAmount <= 0) {
      toast({ title: "Validasi Gagal", description: "Pilih Akun Kas/Bank dan masukkan nominal refund yang valid", variant: "destructive" })
      return
    }

    try {
      setSubmittingRefund(true)
      await PurchasingAPI.refundSupplierCredit(selectedCredit.id, {
        cashAccountId: refundCashAccountId,
        amount: Number(refundAmount),
        reference: refundReference,
        idempotencyKey: `refund-${selectedCredit.id}-${Date.now()}`,
      })
      toast({ title: "Berhasil", description: "Pengembalian dana (refund) supplier berhasil dicatat dan masuk ke kas/bank!" })
      setRefundModalOpen(false)
      fetchCredits()
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Gagal Refund",
        description: err.response?.data?.message || err.message || "Gagal memproses refund supplier",
        variant: "destructive",
      })
    } finally {
      setSubmittingRefund(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            Nota Kredit Pemasok (Supplier Credit Notes)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manajemen saldo kredit retur vendor, alokasi pemotongan faktur (non-cash), dan pengembalian dana (refund).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={() => router.push("/purchasing/returns")}>
            <Undo2 className="h-4 w-4" /> Daftar Retur Pembelian
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border" onClick={fetchCredits}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor kredit, retur, atau supplier..."
                className="pl-9 bg-muted border-border h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-muted/30 px-4 pt-3 border-b border-border flex gap-1 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap
                ${
                  activeTab === tab
                    ? "border-purple-600 text-purple-600 bg-purple-500/10"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              {tab === "FULLY_APPLIED"
                ? "Teralokasi Penuh"
                : tab === "PARTIALLY_APPLIED"
                ? "Teralokasi Sebagian"
                : tab === "POSTED"
                ? "Tersedia"
                : tab === "REVERSED"
                ? "Dibatalkan"
                : tab}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span>Memuat data nota kredit supplier...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                <CreditCard className="h-9 w-9 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Nota Kredit Supplier</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Nota kredit otomatis terbentuk ketika Purchase Return disetujui atau dibuat dari alur penyesuaian klaim retur vendor.
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm gap-2" onClick={() => router.push("/purchasing/returns")}>
                Lihat Retur Pembelian <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground">Nomor Nota Kredit</TableHead>
                    <TableHead className="font-semibold text-foreground">Supplier / Vendor</TableHead>
                    <TableHead className="font-semibold text-foreground">Ref. Retur</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Total Nilai</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Sisa Saldo Kredit</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 border-border">
                      <TableCell className="font-semibold text-purple-600">{item.credit_note_number}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.supplier?.name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.purchase_return?.return_number || "-"}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(item.total_amount)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{formatIDR(item.remaining_credit)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.remaining_credit > 0 && item.status !== "REVERSED" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                                onClick={() => openApplyDialog(item)}
                              >
                                Terapkan ke Tagihan
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => openRefundDialog(item)}
                              >
                                Terima Refund
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Selesai / Nihil</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: Apply Credit to Vendor Bill */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" /> Alokasikan Kredit ke Faktur Vendor Bill
            </DialogTitle>
            <DialogDescription>
              Potong saldo hutang usaha Vendor Bill menggunakan saldo kredit pemasok tanpa pergerakan kas.
            </DialogDescription>
          </DialogHeader>

          {selectedCredit && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1.5 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nota Kredit:</span>
                  <span className="font-semibold text-foreground">{selectedCredit.credit_note_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-semibold text-foreground">{selectedCredit.supplier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa Saldo Kredit Tersedia:</span>
                  <span className="font-bold text-emerald-600">{formatIDR(selectedCredit.remaining_credit)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">ID Faktur Vendor Bill Target *</label>
                <Input
                  placeholder="Masukkan UUID / ID Faktur Vendor Bill..."
                  value={targetBillId}
                  onChange={(e) => setTargetBillId(e.target.value)}
                  className="bg-background text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Faktur target harus berstatus POSTED, memiliki sisa tagihan, dan milik supplier yang sama.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nominal Alokasi (Rp) *</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedCredit.remaining_credit}
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(Number(e.target.value))}
                  className="bg-background text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Catatan Tambahan</label>
                <Input
                  placeholder="Contoh: Alokasi retur kayu cacat PO-001..."
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  className="bg-background text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyModalOpen(false)} disabled={submittingApply}>
              Batal
            </Button>
            <Button onClick={handleApplyCredit} disabled={submittingApply} className="bg-purple-600 hover:bg-purple-700 text-white">
              {submittingApply ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Konfirmasi Alokasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Supplier Refund */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" /> Catat Pengembalian Dana (Refund) Supplier
            </DialogTitle>
            <DialogDescription>
              Catat pergerakan kas/bank masuk atas pengembalian sisa kredit retur dari pemasok.
            </DialogDescription>
          </DialogHeader>

          {selectedCredit && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1.5 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nota Kredit:</span>
                  <span className="font-semibold text-foreground">{selectedCredit.credit_note_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-semibold text-foreground">{selectedCredit.supplier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa Saldo Refundable:</span>
                  <span className="font-bold text-emerald-600">{formatIDR(selectedCredit.remaining_credit)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">ID Akun Kas/Bank Penerima *</label>
                <Input
                  placeholder="Masukkan ID Akun Kas/Bank tujuan..."
                  value={refundCashAccountId}
                  onChange={(e) => setRefundCashAccountId(e.target.value)}
                  className="bg-background text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nominal Pengembalian Dana (Rp) *</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedCredit.remaining_credit}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="bg-background text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nomor Referensi Transfer / Bukti Setor</label>
                <Input
                  placeholder="Contoh: REF-BCA-9812938..."
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  className="bg-background text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundModalOpen(false)} disabled={submittingRefund}>
              Batal
            </Button>
            <Button onClick={handleRefundCredit} disabled={submittingRefund} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submittingRefund ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
              Catat Penerimaan Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
