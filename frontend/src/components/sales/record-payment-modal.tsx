"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaymentAPI } from "@/lib/api"
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
  onSuccess?: () => void
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: RecordPaymentModalProps) {
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cashAccounts, setCashAccounts] = useState<any[]>([])
  const [cashAccountId, setCashAccountId] = useState("")
  const [amount, setAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0]
  )
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && invoice) {
      setAmount(invoice.remaining_amount || 0)
      setError("")
      setSuccess(false)
      loadCashAccounts()
    }
  }, [isOpen, invoice])

  const loadCashAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const accounts = await PaymentAPI.getCashAccounts()
      setCashAccounts(Array.isArray(accounts) ? accounts : [])
      if (Array.isArray(accounts) && accounts.length > 0) {
        setCashAccountId(accounts[0].id)
      }
    } catch (e) {
      console.error("Gagal memuat akun kas:", e)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) {
      setError("Jumlah pembayaran harus lebih besar dari 0")
      return
    }

    if (amount > (invoice?.remaining_amount || 0) + 0.01) {
      setError(
        `Jumlah pembayaran (Rp ${amount.toLocaleString("id-ID")}) melebihi sisa tagihan (Rp ${(invoice?.remaining_amount || 0).toLocaleString("id-ID")})`
      )
      return
    }

    if (!cashAccountId) {
      setError("Pilih akun kas atau bank tujuan pembayaran")
      return
    }

    try {
      setSubmitting(true)
      setError("")

      const idempotencyKey = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

      await PaymentAPI.create({
        invoiceId: invoice.id,
        customerId: invoice.customer_id,
        amount: Number(amount),
        cashAccountId,
        paymentDate,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey,
      })

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Gagal mencatat pembayaran")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Catat Pembayaran Faktur</DialogTitle>
                <DialogDescription className="text-xs">
                  {invoice?.invoice_number} — {invoice?.customer?.name || "Pelanggan"}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Sisa: Rp {(invoice?.remaining_amount || 0).toLocaleString("id-ID")}
            </Badge>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="font-semibold text-foreground text-base">Pembayaran Berhasil Dicatat!</h3>
            <p className="text-xs text-muted-foreground">
              Saldo piutang dan mutasi kas telah diperbarui secara otomatis.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Akun Kas / Bank Penerima</Label>
              <Select value={cashAccountId} onValueChange={(val) => setCashAccountId(val || "")} disabled={loadingAccounts}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder={loadingAccounts ? "Memuat akun kas..." : "Pilih Akun Kas/Bank"} />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      {acc.name} ({acc.account_type || "Kas"}) — Saldo: Rp {(acc.current_balance || 0).toLocaleString("id-ID")}
                    </SelectItem>
                  ))}
                  {cashAccounts.length === 0 && !loadingAccounts && (
                    <SelectItem value="default" disabled className="text-xs">
                      Tidak ada akun kas terdaftar
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jumlah Pembayaran (Rp)</Label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0"
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tanggal Pembayaran</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || "BANK_TRANSFER")}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER" className="text-xs">Transfer Bank</SelectItem>
                    <SelectItem value="CASH" className="text-xs">Tunai (Cash)</SelectItem>
                    <SelectItem value="GIRO" className="text-xs">Giro / Cek</SelectItem>
                    <SelectItem value="QRIS" className="text-xs">QRIS / E-Wallet</SelectItem>
                    <SelectItem value="CREDIT_CARD" className="text-xs">Kartu Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nomor Bukti / Referensi</Label>
                <Input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Contoh: TRF-BCA-98172"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Catatan / Keterangan</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan pembayaran (opsional)"
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan Pembayaran
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
