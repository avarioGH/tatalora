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
import { Switch } from "@/components/ui/switch"
import { CommunicationAPI } from "@/lib/api"
import { 
  MessageSquare, Mail, Send, ExternalLink, FileText, CheckCircle2, AlertCircle, Loader2, Download
} from "lucide-react"

interface SendInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  onSuccess?: () => void
}

export function SendInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  onSuccess,
}: SendInvoiceModalProps) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [channel, setChannel] = useState<"WHATSAPP" | "EMAIL" | "WHATSAPP_MANUAL">("WHATSAPP_MANUAL")
  
  // Prep Data
  const [prepData, setPrepData] = useState<any>(null)
  const [recipientPhone, setRecipientPhone] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [subject, setSubject] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [includePdf, setIncludePdf] = useState(true)

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadPreparation()
    }
  }, [isOpen, invoiceId])

  const loadPreparation = async () => {
    try {
      setLoading(true)
      const data = await CommunicationAPI.prepareInvoice(invoiceId)
      setPrepData(data)
      setRecipientPhone(data.prefill?.recipient_phone || "")
      setRecipientEmail(data.prefill?.recipient_email || "")
      setRecipientName(data.prefill?.recipient_name || "")
      setSubject(data.prefill?.email_subject || "")
      setMessageBody(data.prefill?.whatsapp_message || "")

      // Default to official WhatsApp if enabled, else manual WhatsApp
      if (data.channels?.whatsapp_official?.available) {
        setChannel("WHATSAPP")
      } else {
        setChannel("WHATSAPP_MANUAL")
      }
    } catch (err: any) {
      console.error(err)
      alert("Gagal memuat pratinjau pengiriman: " + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleChannelSwitch = (selected: "WHATSAPP" | "EMAIL" | "WHATSAPP_MANUAL") => {
    setChannel(selected)
    if (selected === "EMAIL") {
      setMessageBody(prepData?.prefill?.email_body || "")
    } else {
      setMessageBody(prepData?.prefill?.whatsapp_message || "")
    }
  }

  const handleSend = async () => {
    try {
      setSending(true)

      // Handle WhatsApp Manual Web Link directly
      if (channel === "WHATSAPP_MANUAL") {
        const cleanPhone = (recipientPhone || "").replace(/[^0-9]/g, "")
        const waPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone
        const link = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(messageBody)}`
        
        // Record audit trail via API
        await CommunicationAPI.sendInvoice(invoiceId, {
          channel: "WHATSAPP_MANUAL",
          recipientPhone,
          recipientName,
          messageBody,
          idempotencyKey: `MANUAL-${invoiceId}-${Date.now()}`,
        })

        window.open(link, "_blank", "noopener,noreferrer")
        alert("WhatsApp Web telah dibuka di tab baru dan riwayat pengiriman tercatat di sistem!")
        onSuccess?.()
        onClose()
        return
      }

      // Handle WhatsApp Official or Email
      const res = await CommunicationAPI.sendInvoice(invoiceId, {
        channel,
        recipientPhone,
        recipientEmail,
        recipientName,
        subject,
        messageBody,
        includePdf,
        idempotencyKey: `SEND-${invoiceId}-${channel}-${Date.now()}`,
      })

      alert(`Faktur berhasil dikirim melalui ${channel === "WHATSAPP" ? "WhatsApp API" : "Email"}!`)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      alert("Gagal mengirim: " + (err.response?.data?.message || err.message))
    } finally {
      setSending(false)
    }
  }

  const pdfDownloadUrl = `/communication/invoices/${invoiceId}/pdf`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Send className="w-5 h-5 text-indigo-600" />
            Kirim Tagihan Penjualan ({prepData?.invoice?.invoice_number || "..."})
          </DialogTitle>
          <DialogDescription>
            Pilih saluran pengiriman pesan dan periksa rincian pesan sebelum dikirimkan ke pelanggan.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span>Menyiapkan pratinjau pesan dan dokumen faktur...</span>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Channel Selection Buttons */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">
                Saluran Pengiriman
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={channel === "WHATSAPP_MANUAL" ? "default" : "outline"}
                  className={`gap-2 justify-center text-xs sm:text-sm ${channel === "WHATSAPP_MANUAL" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={() => handleChannelSwitch("WHATSAPP_MANUAL")}
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp Web
                </Button>

                <Button
                  type="button"
                  variant={channel === "WHATSAPP" ? "default" : "outline"}
                  disabled={!prepData?.channels?.whatsapp_official?.available}
                  className={`gap-2 justify-center text-xs sm:text-sm ${channel === "WHATSAPP" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={() => handleChannelSwitch("WHATSAPP")}
                >
                  <MessageSquare className="w-4 h-4" />
                  Meta Cloud API
                  {!prepData?.channels?.whatsapp_official?.available && (
                    <span className="text-[10px] ml-1 opacity-70">(Belum Aktif)</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant={channel === "EMAIL" ? "default" : "outline"}
                  disabled={!prepData?.channels?.email?.available}
                  className={`gap-2 justify-center text-xs sm:text-sm ${channel === "EMAIL" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                  onClick={() => handleChannelSwitch("EMAIL")}
                >
                  <Mail className="w-4 h-4" />
                  Kirim Email
                  {!prepData?.channels?.email?.available && (
                    <span className="text-[10px] ml-1 opacity-70">(Belum Aktif)</span>
                  )}
                </Button>
              </div>
            </div>

            {/* Recipient Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg border border-border">
              <div className="space-y-1">
                <Label className="text-xs">Nama Penerima</Label>
                <Input 
                  value={recipientName} 
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="h-9 bg-card"
                />
              </div>

              {channel === "EMAIL" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Alamat Email Penerima</Label>
                  <Input 
                    type="email"
                    value={recipientEmail} 
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="h-9 bg-card"
                    placeholder="nama@perusahaan.com"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Nomor WhatsApp Penerima</Label>
                  <Input 
                    value={recipientPhone} 
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="h-9 bg-card"
                    placeholder="08123456789 atau +628123..."
                  />
                </div>
              )}
            </div>

            {/* Email Subject if Email */}
            {channel === "EMAIL" && (
              <div className="space-y-1">
                <Label className="text-xs">Subjek Email</Label>
                <Input 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9"
                />
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Isi Pesan (Dapat Disesuaikan)</Label>
                <span className="text-[11px] text-muted-foreground">Variabel telah otomatis terisi</span>
              </div>
              <Textarea 
                rows={5}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="text-xs font-mono leading-relaxed"
              />
            </div>

            {/* Attachment preview for Email & Document */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground block">
                    Faktur-{prepData?.invoice?.invoice_number}.pdf
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Dokumen PDF resmi TATALORA ERP (Otomatis dilampirkan)
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => window.open(pdfDownloadUrl, "_blank")}
              >
                <Download className="w-3.5 h-3.5" /> Pratinjau PDF
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border pt-4 flex sm:justify-between items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Batal
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={loading || sending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {channel === "WHATSAPP_MANUAL" ? "Buka di WhatsApp Web" : "Kirim Sekarang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
