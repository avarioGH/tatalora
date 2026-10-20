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
import { Badge } from "@/components/ui/badge"
import { PaymentAPI } from "@/lib/api"
import { MessageSquare, Mail, Send, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react"

interface SendPaymentReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  payment: any
  customer: any
  invoiceNumber: string
}

export function SendPaymentReceiptModal({
  isOpen,
  onClose,
  payment,
  customer,
  invoiceNumber,
}: SendPaymentReceiptModalProps) {
  const [channel, setChannel] = useState<"WHATSAPP_MANUAL" | "WHATSAPP" | "EMAIL">("WHATSAPP_MANUAL")
  const [recipientPhone, setRecipientPhone] = useState(customer?.phone || "")
  const [recipientEmail, setRecipientEmail] = useState(customer?.email || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    try {
      setSubmitting(true)
      setError("")

      const res = await PaymentAPI.sendConfirmation(payment.id, {
        channel,
        recipientPhone: recipientPhone.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        idempotencyKey: `RCPT-${payment.id}-${channel}-${Date.now()}`,
      })

      if (res.webLink) {
        window.open(res.webLink, "_blank")
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Gagal mengirim tanda terima")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" /> Kirim Bukti Pembayaran
          </DialogTitle>
          <DialogDescription className="text-xs">
            Kirimkan konfirmasi penerimaan dana untuk pembayaran {payment?.payment_number} ({invoiceNumber})
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-sm font-semibold text-foreground">Bukti Pembayaran Terkirim!</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Channel Selection */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={channel === "WHATSAPP_MANUAL" ? "default" : "outline"}
                className={`text-xs gap-1.5 h-10 ${channel === "WHATSAPP_MANUAL" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => setChannel("WHATSAPP_MANUAL")}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WA Web
              </Button>
              <Button
                type="button"
                variant={channel === "WHATSAPP" ? "default" : "outline"}
                className={`text-xs gap-1.5 h-10 ${channel === "WHATSAPP" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => setChannel("WHATSAPP")}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WA Resmi
              </Button>
              <Button
                type="button"
                variant={channel === "EMAIL" ? "default" : "outline"}
                className={`text-xs gap-1.5 h-10 ${channel === "EMAIL" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                onClick={() => setChannel("EMAIL")}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
            </div>

            {channel.startsWith("WHATSAPP") ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nomor WhatsApp Penerima</Label>
                <Input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email Penerima</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="pelanggan@example.com"
                  className="text-xs"
                />
              </div>
            )}

            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground border">
              <div className="flex justify-between">
                <span>No. Pembayaran:</span>
                <span className="font-semibold text-foreground">{payment?.payment_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Jumlah Diterima:</span>
                <span className="font-semibold text-emerald-600">
                  Rp {(payment?.amount || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Metode:</span>
                <span className="text-foreground">{payment?.payment_method}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={handleSend}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {channel === "WHATSAPP_MANUAL" ? "Buka di WhatsApp" : "Kirim Konfirmasi"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
