"use client"

import React, { useState } from "react"
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
import { PaymentAPI } from "@/lib/api"
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react"

interface ReversePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: any
  onSuccess?: () => void
}

export function ReversePaymentModal({
  isOpen,
  onClose,
  payment,
  onSuccess,
}: ReversePaymentModalProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError("Alasan pembatalan pembayaran wajib diisi")
      return
    }

    try {
      setSubmitting(true)
      setError("")

      await PaymentAPI.reverse(payment.id, reason.trim())
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Gagal membatalkan pembayaran")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Batalkan Pembayaran</DialogTitle>
              <DialogDescription className="text-xs">
                {payment?.payment_number} — Rp {(payment?.amount || 0).toLocaleString("id-ID")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleReverse} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {error}
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Tindakan ini akan mengembalikan sisa tagihan faktur dan mencatat transaksi pembalik (reversal) pada kas & buku besar.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Alasan Pembatalan / Void</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Kesalahan input nominal rekening / Bilyet Giro dibatalkan"
              className="text-xs"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              className="gap-1.5"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Konfirmasi Batalkan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
