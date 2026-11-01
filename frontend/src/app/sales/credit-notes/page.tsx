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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

export default function CustomerCreditNotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [creditNotes, setCreditNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Dialog state for Apply Credit
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<any>(null)
  const [targetInvoiceId, setTargetInvoiceId] = useState("")
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
      const res = await axios.get("/api/sales/customer-credits")
      setCreditNotes(Array.isArray(res.data) ? res.data : [])
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
      item.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sales_return?.return_number?.toLowerCase().includes(search.toLowerCase())

    if (activeTab === "Semua") return matchSearch
    return matchSearch && item.status === activeTab
  })

  const openApplyDialog = (credit: any) => {
    setSelectedCredit(credit)
    setTargetInvoiceId("")
    setApplyAmount(credit.remaining_credit || 0)
    setApplyNotes("")
    setApplyModalOpen(true)
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetInvoiceId || applyAmount <= 0) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih faktur tujuan dan jumlah alokasi yang valid",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingApply(true)
      await axios.post(`/api/sales/customer-credits/${selectedCredit.id}/apply`, {
        invoiceId: targetInvoiceId,
        amount: Number(applyAmount),
        notes: applyNotes,
        idempotencyKey: `CCN-APP-${Date.now()}`,
      })

      toast({
        title: "Alokasi Berhasil",
        description: `Nota kredit berhasil dialokasikan ke faktur penjualan`,
      })
      setApplyModalOpen(false)
      fetchCredits()
    } catch (err: any) {
      toast({
        title: "Alokasi Gagal",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    } finally {
      setSubmittingApply(false)
    }
  }

  const openRefundDialog = (credit: any) => {
    setSelectedCredit(credit)
    setRefundCashAccountId("")
    setRefundAmount(credit.remaining_credit || 0)
    setRefundReference("")
    setRefundModalOpen(true)
  }

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundCashAccountId || refundAmount <= 0) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih akun kas/bank dan masukkan nominal refund yang valid",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingRefund(true)
      await axios.post(`/api/sales/customer-credits/${selectedCredit.id}/refund`, {
        cashAccountId: refundCashAccountId,
        amount: Number(refundAmount),
        reference: refundReference,
        idempotencyKey: `CCN-REF-${Date.now()}`,
      })

      toast({
        title: "Refund Berhasil Diproses",
        description: `Pengeluaran kas/bank untuk pengembalian dana pelanggan telah dicatat`,
      })
      setRefundModalOpen(false)
      fetchCredits()
    } catch (err: any) {
      toast({
        title: "Refund Gagal",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    } finally {
      setSubmittingRefund(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Credit Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola saldo nota kredit pelanggan, alokasi faktur terbuka, dan refund kas/bank
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales/returns">
            <Button variant="outline" className="gap-2">
              <Undo2 className="w-4 h-4" /> Retur Penjualan
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchCredits} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Total Nota Kredit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditNotes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Seluruh nota kredit terbit</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Saldo Kredit Tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatIDR(
                creditNotes
                  .filter((c) => c.status !== "REVERSED")
                  .reduce((acc, c) => acc + (c.remaining_credit || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dapat dialokasikan / direfund</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Teralokasi ke Faktur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatIDR(
                creditNotes
                  .filter((c) => c.status !== "REVERSED")
                  .reduce((acc, c) => acc + (c.total_amount - c.remaining_credit || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mengurangi piutang pelanggan</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Total Nilai Retur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatIDR(
                creditNotes.reduce((acc, c) => acc + (c.total_amount || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Akumulasi kompensasi pelanggan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main List & Filters */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border text-xs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    activeTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "Semua" ? "Semua Status" : tab}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nomor kredit, pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Nomor Nota Kredit</TableHead>
                <TableHead className="font-semibold">Pelanggan</TableHead>
                <TableHead className="font-semibold">Retur Asal</TableHead>
                <TableHead className="font-semibold text-right">Total Kredit</TableHead>
                <TableHead className="font-semibold text-right">Sisa Saldo</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mt-2 block">Memuat daftar customer credit note...</span>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                    Tidak ada nota kredit yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        <span>{item.credit_note_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.customer?.name || "-"}</TableCell>
                    <TableCell>
                      {item.sales_return ? (
                        <Link
                          href={`/sales/returns/${item.sales_return.id}`}
                          className="text-primary hover:underline flex items-center gap-1 text-xs"
                        >
                          {item.sales_return.return_number}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(item.total_amount)}</TableCell>
                    <TableCell className="text-right font-bold text-purple-600">
                      {formatIDR(item.remaining_credit)}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.remaining_credit > 0 && item.status !== "REVERSED" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                              onClick={() => openApplyDialog(item)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Alokasi Faktur
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openRefundDialog(item)}
                            >
                              <Banknote className="w-3.5 h-3.5" /> Refund
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Apply Credit Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Alokasi Customer Credit Note</DialogTitle>
            <DialogDescription>
              Terapkan saldo kredit <strong>{selectedCredit?.credit_note_number}</strong> ke faktur terbuka pelanggan {selectedCredit?.customer?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-4 pt-2">
            <div className="p-3 bg-muted/40 rounded-lg border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Tersedia:</span>
                <span className="font-bold text-purple-600">{formatIDR(selectedCredit?.remaining_credit)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ID Faktur Penjualan Terbuka *</label>
              <Input
                placeholder="Masukkan ID Faktur Penjualan (UUID)"
                value={targetInvoiceId}
                onChange={(e) => setTargetInvoiceId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Hanya faktur belum lunas milik pelanggan yang sama.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nominal Alokasi (Rp) *</label>
              <Input
                type="number"
                min="1"
                max={selectedCredit?.remaining_credit || 0}
                step="any"
                value={applyAmount || ""}
                onChange={(e) => setApplyAmount(Number(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Catatan Alokasi</label>
              <Input
                placeholder="Catatan opsional"
                value={applyNotes}
                onChange={(e) => setApplyNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setApplyModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submittingApply} className="gap-2">
                {submittingApply && <Loader2 className="w-4 h-4 animate-spin" />} Terapkan Alokasi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Refund Kas / Bank Pelanggan</DialogTitle>
            <DialogDescription>
              Kembalikan dana sisa nota kredit <strong>{selectedCredit?.credit_note_number}</strong> melalui kas atau transfer bank.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRefundSubmit} className="space-y-4 pt-2">
            <div className="p-3 bg-muted/40 rounded-lg border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maksimal Refund:</span>
                <span className="font-bold text-emerald-600">{formatIDR(selectedCredit?.remaining_credit)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ID Akun Kas / Bank Pengeluaran *</label>
              <Input
                placeholder="Masukkan ID Akun Kas/Bank (UUID)"
                value={refundCashAccountId}
                onChange={(e) => setRefundCashAccountId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jumlah Pengembalian (Rp) *</label>
              <Input
                type="number"
                min="1"
                max={selectedCredit?.remaining_credit || 0}
                step="any"
                value={refundAmount || ""}
                onChange={(e) => setRefundAmount(Number(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nomor Referensi Transfer / Bukti</label>
              <Input
                placeholder="Contoh: REF-TRF-9098"
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setRefundModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submittingRefund} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {submittingRefund && <Loader2 className="w-4 h-4 animate-spin" />} Proses Refund
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
