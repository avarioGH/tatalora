"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { Wallet, Loader2, CheckCircle2 } from "lucide-react"

export function ReceivePaymentModal({
  open,
  onOpenChange,
  invoice,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onSuccess: () => void
}) {
  const [cashAccounts, setCashAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [amount, setAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("Transfer")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.remaining_amount ?? invoice.total ?? 0)
    }
  }, [invoice])

  useEffect(() => {
    if (open) {
      const fetchAccounts = async () => {
        setLoading(true)
        try {
          const res = await api.get("/finance/payments/cash-accounts")
          const accounts = res.data?.data || res.data || []
          setCashAccounts(accounts)
          if (accounts.length > 0) {
            setSelectedAccountId(accounts[0].id)
          }
        } catch (e) {
          console.error("Error loading cash accounts:", e)
        } finally {
          setLoading(false)
        }
      }
      fetchAccounts()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoice) return
    if (amount <= 0) return alert("Jumlah pembayaran harus lebih dari 0!")

    setSubmitting(true)
    try {
      await api.post("/finance/payments", {
        invoiceId: invoice.id,
        customerId: invoice.customer_id,
        amount: Number(amount),
        cashAccountId: selectedAccountId || undefined,
        paymentDate,
        paymentMethod,
        notes,
        reference: invoice.invoice_number
      })
      alert("Penerimaan pembayaran berhasil disimpan!")
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      alert("Gagal memproses pembayaran: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  if (!invoice) return null

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Wallet className="w-5 h-5 text-emerald-600" /> Terima Pembayaran Penjualan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <div className="bg-muted/40 p-3 rounded-lg flex justify-between items-center border border-border/60">
              <div>
                <p className="text-xs text-muted-foreground">Faktur Penjualan</p>
                <p className="font-bold text-foreground text-sm">{invoice.invoice_number}</p>
                <p className="text-xs text-indigo-600 font-medium">{invoice.customer?.name || "Pelanggan"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Sisa Tagihan</p>
                <p className="font-bold text-rose-600 text-base">{formatIDR(invoice.remaining_amount ?? invoice.total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Pembayaran</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="bg-background text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || "Transfer")}>
                  <SelectTrigger className="h-9 bg-background text-xs">
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="Transfer">Transfer Bank</SelectItem>
                    <SelectItem value="Cash">Tunai / Cash</SelectItem>
                    <SelectItem value="Giro">Giro / Cek</SelectItem>
                    <SelectItem value="QRIS">QRIS / Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Setor ke Akun Kas & Bank</Label>
              <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val || "")}>
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder={loading ? "Memuat akun..." : "Pilih Akun Kas/Bank"} />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {cashAccounts.length === 0 ? (
                    <SelectItem value="default" disabled>Kas Operasional</SelectItem>
                  ) : (
                    cashAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_code || "Kas/Bank"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Jumlah yang Diterima (Rp)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                min="1"
                max={invoice.remaining_amount ?? invoice.total}
                className="bg-background font-bold text-emerald-600 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan / Referensi</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="No referensi transfer, bukti bayar..."
                rows={2}
                className="bg-background resize-none text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              Konfirmasi Terima Pembayaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
