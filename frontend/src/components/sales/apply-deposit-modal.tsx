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
import { PaymentAPI } from "@/lib/api"
import { Coins, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react"

interface ApplyDepositModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
  onSuccess?: () => void
}

export function ApplyDepositModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: ApplyDepositModalProps) {
  const [loadingDeposits, setLoadingDeposits] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deposits, setDeposits] = useState<any[]>([])
  const [selectedPaymentId, setSelectedPaymentId] = useState("")
  const [amount, setAmount] = useState<number>(0)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && invoice) {
      setError("")
      setSuccess(false)
      loadDeposits()
    }
  }, [isOpen, invoice])

  const loadDeposits = async () => {
    try {
      setLoadingDeposits(true)
      const data = await PaymentAPI.getAvailableDeposits({
        customerId: invoice.customer_id,
        salesOrderId: invoice.sales_order_id,
      })
      const list = Array.isArray(data) ? data : []
      setDeposits(list)

      if (list.length > 0) {
        // Auto-select first deposit or the one linked to this SO
        const preferred = list.find((d: any) => d.linkedToThisSo) || list[0]
        setSelectedPaymentId(preferred.paymentId)
        const initialAmt = Math.min(preferred.availableBalance, invoice.remaining_amount || 0)
        setAmount(initialAmt)
      } else {
        setSelectedPaymentId("")
        setAmount(0)
      }
    } catch (e) {
      console.error("Gagal memuat deposit:", e)
    } finally {
      setLoadingDeposits(false)
    }
  }

  const handleSelectDeposit = (dep: any) => {
    setSelectedPaymentId(dep.paymentId)
    const maxApplicable = Math.min(dep.availableBalance, invoice?.remaining_amount || 0)
    setAmount(maxApplicable)
  }

  const selectedDeposit = deposits.find((d) => d.paymentId === selectedPaymentId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaymentId) {
      setError("Pilih uang muka yang ingin digunakan")
      return
    }

    if (!amount || amount <= 0) {
      setError("Jumlah alokasi harus lebih besar dari 0")
      return
    }

    if (selectedDeposit && amount > selectedDeposit.availableBalance + 0.01) {
      setError(
        `Jumlah alokasi melebihi sisa uang muka yang tersedia (Rp ${selectedDeposit.availableBalance.toLocaleString("id-ID")})`
      )
      return
    }

    if (amount > (invoice?.remaining_amount || 0) + 0.01) {
      setError(
        `Jumlah alokasi melebihi sisa tagihan faktur (Rp ${(invoice?.remaining_amount || 0).toLocaleString("id-ID")})`
      )
      return
    }

    try {
      setSubmitting(true)
      setError("")

      await PaymentAPI.applyDeposit({
        invoiceId: invoice.id,
        paymentId: selectedPaymentId,
        amount: Number(amount),
        notes: notes.trim() || undefined,
      })

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Gagal menerapkan uang muka")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Gunakan Uang Muka (Deposit)</DialogTitle>
                <DialogDescription className="text-xs">
                  Alokasikan saldo uang muka pelanggan ke tagihan faktur ini
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Sisa Tagihan: Rp {(invoice?.remaining_amount || 0).toLocaleString("id-ID")}
            </Badge>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="font-semibold text-foreground text-base">Uang Muka Berhasil Diterapkan!</h3>
            <p className="text-xs text-muted-foreground">
              Saldo faktur telah berkurang tanpa mencatat mutasi kas baru (non-kas).
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

            {/* Non-cash explanation note */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Prinsip Akuntansi:</strong> Uang muka telah diakui dalam kas saat pembayaran awal diterima. Alokasi ini memotong piutang tanpa membuat pergerakan kas ganda.
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Pilih Uang Muka Pelanggan Tersedia</Label>
              {loadingDeposits ? (
                <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                  Memeriksa ketersediaan uang muka...
                </div>
              ) : deposits.length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-lg text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Tidak Ada Uang Muka Tersedia</p>
                  <p>Pelanggan ini tidak memiliki saldo uang muka atau deposit yang belum teralokasi.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {deposits.map((dep) => {
                    const isSelected = dep.paymentId === selectedPaymentId
                    return (
                      <div
                        key={dep.paymentId}
                        onClick={() => handleSelectDeposit(dep)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/5 shadow-sm"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{dep.paymentNumber}</span>
                            {dep.linkedToThisSo && (
                              <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-0">
                                Terkait Sales Order Ini
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-mono font-semibold text-emerald-600">
                            Tersedia: Rp {(dep.availableBalance || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground text-[11px] mt-1">
                          <span>{new Date(dep.paymentDate).toLocaleDateString("id-ID")} via {dep.paymentMethod}</span>
                          <span>Total Awal: Rp {(dep.totalAmount || 0).toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {deposits.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Jumlah yang Akan Dialokasikan (Rp)</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedDeposit ? Math.min(selectedDeposit.availableBalance, invoice?.remaining_amount || 0) : undefined}
                    step="any"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="text-xs font-mono"
                    required
                  />
                  {selectedDeposit && (
                    <p className="text-[11px] text-muted-foreground">
                      Maksimum yang dapat dialokasikan: Rp{" "}
                      {Math.min(selectedDeposit.availableBalance, invoice?.remaining_amount || 0).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Catatan Alokasi (Opsional)</Label>
                  <Textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Pemotongan dari DP PO"
                    className="text-xs"
                  />
                </div>
              </>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Batal
              </Button>
              {deposits.length > 0 && (
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                  disabled={submitting || !selectedPaymentId || deposits.length === 0}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Terapkan Uang Muka
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
