"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { api, CommunicationAPI } from "@/lib/api"
import { SendInvoiceModal } from "@/components/sales/send-invoice-modal"
import { RecordPaymentModal } from "@/components/sales/record-payment-modal"
import { ApplyDepositModal } from "@/components/sales/apply-deposit-modal"
import { SendPaymentReceiptModal } from "@/components/sales/send-payment-receipt-modal"
import { ReversePaymentModal } from "@/components/sales/reverse-payment-modal"
import { 
  ArrowLeft, Send, Printer, Clock, CheckCircle2, AlertCircle, FileText, 
  Building2, User, Phone, Mail, History, CreditCard, Coins, RotateCcw, 
  Receipt, Plus
} from "lucide-react"

export default function SalesInvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [data, setData] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [receiptPayment, setReceiptPayment] = useState<any>(null)
  const [reversePayment, setReversePayment] = useState<any>(null)

  useEffect(() => {
    if (id) {
      loadInvoice()
    }
  }, [id])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      const [invRes, histRes] = await Promise.all([
        api.get(`/finance/invoices/${id}`).catch(() => null),
        CommunicationAPI.getInvoiceHistory(id).catch(() => []),
      ])

      if (invRes?.data) {
        setData(invRes.data)
      }
      setHistory(histRes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Lunas</Badge>
      case "POSTED":
        return <Badge className="bg-blue-500/10 text-blue-600 border-0">Tercatat (Belum Lunas)</Badge>
      case "PARTIALLY PAID":
      case "PARTIALLY_PAID":
        return <Badge className="bg-amber-500/10 text-amber-600 border-0">Dibayar Sebagian</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat rincian faktur penjualan...</div>
  }

  if (!data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Faktur tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Button variant="outline" onClick={() => router.push("/sales/invoices")}>Kembali ke Daftar</Button>
      </div>
    )
  }

  // Combine direct payments and payment allocations
  const directPayments = data.payments || []
  const allocations = (data.PaymentAllocation || []).filter(
    (a: any) => a.payment && !directPayments.some((dp: any) => dp.id === a.payment.id)
  )

  const isFullyPaid = (data.remaining_amount || 0) <= 0.01

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/sales/invoices")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {data.invoice_number}
              </h1>
              {getStatusBadge(data.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Dibuat pada {new Date(data.created_at || data.invoice_date).toLocaleDateString("id-ID")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Action: Catat Pembayaran */}
          {!isFullyPaid && (
            <>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                <CreditCard className="w-4 h-4" /> Catat Pembayaran
              </Button>

              <Button 
                variant="outline" 
                className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5"
                onClick={() => setIsDepositModalOpen(true)}
              >
                <Coins className="w-4 h-4" /> Gunakan Uang Muka
              </Button>
            </>
          )}

          {/* Action: Kirim Tagihan */}
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"
            onClick={() => setIsSendModalOpen(true)}
          >
            <Send className="w-4 h-4" /> Kirim Tagihan
          </Button>

          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => window.open(`/communication/invoices/${id}/pdf`, "_blank")}
          >
            <Printer className="w-4 h-4" /> Cetak PDF
          </Button>
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Informasi Tagihan Penjualan</CardTitle>
                  <CardDescription>Rincian transaksi dan daftar barang</CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Jatuh Tempo</span>
                  <span className="text-sm font-semibold text-rose-600">
                    {data.due_date ? new Date(data.due_date).toLocaleDateString("id-ID") : "-"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Pelanggan
                  </span>
                  <p className="font-semibold text-foreground">{data.customer?.name || "-"}</p>
                  <p className="text-xs text-muted-foreground">{data.customer?.address || "Alamat belum diatur"}</p>
                </div>
                <div className="space-y-1 text-right sm:text-left">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 sm:justify-start justify-end">
                    <Phone className="w-3.5 h-3.5" /> Kontak
                  </span>
                  <p className="text-xs text-foreground">{data.customer?.phone || "-"}</p>
                  <p className="text-xs text-foreground">{data.customer?.email || "-"}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-center w-20">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.items || []).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product?.name || item.description || "Item Penjualan"}
                        </TableCell>
                        <TableCell className="text-center">{item.qty}</TableCell>
                        <TableCell className="text-right">
                          Rp {(item.unit_price || 0).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          Rp {(item.subtotal || 0).toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data.items || data.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          Tidak ada baris barang.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Values */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>Rp {(data.subtotal || 0).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pajak (PPN)</span>
                    <span>Rp {(data.tax || 0).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-border pt-2 text-foreground">
                    <span>Total Tagihan</span>
                    <span>Rp {(data.total || 0).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold text-sm">
                    <span>Sudah Dibayar</span>
                    <span>Rp {(data.paid_amount || 0).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-rose-600 border-t border-border pt-1">
                    <span>Sisa Tagihan</span>
                    <span>Rp {(data.remaining_amount || 0).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Riwayat Pembayaran & Alokasi Uang Muka */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" /> Riwayat Pembayaran & Alokasi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Catatan seluruh penerimaan pembayaran langsung dan penggunaan uang muka
                  </CardDescription>
                </div>
                {!isFullyPaid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Pembayaran
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">No. Bukti</TableHead>
                    <TableHead className="text-xs">Tipe</TableHead>
                    <TableHead className="text-xs">Metode</TableHead>
                    <TableHead className="text-xs text-right">Jumlah</TableHead>
                    <TableHead className="text-xs text-center w-36">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Direct Payments */}
                  {directPayments.map((p: any) => {
                    const isReversed = p.notes && p.notes.includes("[DIBATALKAN]")
                    return (
                      <TableRow key={p.id} className={isReversed ? "opacity-60 bg-muted/30" : ""}>
                        <TableCell className="text-xs">
                          {new Date(p.payment_date).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {p.payment_number}
                          {isReversed && (
                            <Badge variant="destructive" className="ml-1.5 text-[9px] py-0 px-1">
                              Dibatalkan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0">
                            Pembayaran Kas/Bank
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.payment_method}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold font-mono text-emerald-600">
                          Rp {(p.amount || 0).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-xs text-center space-x-1">
                          {!isReversed && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] gap-1 text-indigo-600 hover:text-indigo-700"
                                onClick={() => setReceiptPayment(p)}
                                title="Kirim Konfirmasi"
                              >
                                <Send className="w-3 h-3" /> Bukti
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] gap-1 text-rose-600 hover:text-rose-700"
                                onClick={() => setReversePayment(p)}
                                title="Batalkan Pembayaran"
                              >
                                <RotateCcw className="w-3 h-3" /> Void
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Payment Allocations (e.g. from deposits) */}
                  {allocations.map((a: any) => {
                    const p = a.payment
                    const isReversed = p?.notes && p.notes.includes("[DIBATALKAN]")
                    return (
                      <TableRow key={a.id} className={isReversed ? "opacity-60 bg-muted/30" : ""}>
                        <TableCell className="text-xs">
                          {new Date(a.created_at || p?.payment_date).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {p?.payment_number || "ALOKASI"}
                          {isReversed && (
                            <Badge variant="destructive" className="ml-1.5 text-[9px] py-0 px-1">
                              Dibatalkan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-0">
                            Alokasi Uang Muka DP
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p?.payment_method || "DEPOSIT"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold font-mono text-amber-600">
                          Rp {(a.amount || 0).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-xs text-center space-x-1">
                          {!isReversed && p && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] gap-1 text-indigo-600 hover:text-indigo-700"
                              onClick={() => setReceiptPayment(p)}
                            >
                              <Send className="w-3 h-3" /> Bukti
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {directPayments.length === 0 && allocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs space-y-1">
                        <p>Belum ada riwayat pembayaran yang tercatat untuk faktur ini.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs mt-2 gap-1.5"
                          onClick={() => setIsPaymentModalOpen(true)}
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Catat Pembayaran Sekarang
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Communication History / Audit Trail */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" /> Riwayat Komunikasi
              </CardTitle>
              <CardDescription className="text-xs">
                Log jejak pengiriman invoice & bukti bayar
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                  <p>Belum pernah dikirimkan ke pelanggan.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs gap-1.5"
                    onClick={() => setIsSendModalOpen(true)}
                  >
                    <Send className="w-3.5 h-3.5" /> Kirim Sekarang
                  </Button>
                </div>
              ) : (
                history.map((h: any) => (
                  <div key={h.id} className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {h.channel === "WHATSAPP" ? "WhatsApp API" : h.channel === "WHATSAPP_MANUAL" ? "WhatsApp Web" : "Email"}
                      </span>
                      <Badge className={
                        h.status === "SENT" || h.status === "DELIVERED" ? "bg-emerald-500/10 text-emerald-600 border-0 text-[10px]" :
                        h.status === "FAILED" ? "bg-rose-500/10 text-rose-600 border-0 text-[10px]" :
                        "bg-amber-500/10 text-amber-600 border-0 text-[10px]"
                      }>
                        {h.status}
                      </Badge>
                    </div>

                    {/* Stage Badge */}
                    {h.reminder_stage && (
                      <div className="pt-0.5">
                        {h.reminder_stage === "DUE_TODAY" && (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10 text-[10px] font-medium">
                            🔔 Pengingat: Jatuh Tempo Hari Ini
                          </Badge>
                        )}
                        {h.reminder_stage === "BEFORE_DUE" && (
                          <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-500/10 text-[10px] font-medium">
                            🔔 Pengingat: Sebelum Jatuh Tempo
                          </Badge>
                        )}
                        {h.reminder_stage === "OVERDUE" && (
                          <Badge variant="outline" className="border-rose-500 text-rose-600 bg-rose-500/10 text-[10px] font-medium">
                            ⚠️ Pengingat: Melewati Jatuh Tempo
                          </Badge>
                        )}
                      </div>
                    )}

                    <p className="text-muted-foreground">Penerima: {h.recipient}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>{new Date(h.created_at).toLocaleString("id-ID")}</span>
                      {h.created_by === "SYSTEM_AUTO_REMINDER" ? (
                        <span className="text-[10px] text-indigo-500 font-mono">Otomatisasi Sistem</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <SendInvoiceModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        invoiceId={id}
        onSuccess={loadInvoice}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={data}
        onSuccess={loadInvoice}
      />

      <ApplyDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        invoice={data}
        onSuccess={loadInvoice}
      />

      {receiptPayment && (
        <SendPaymentReceiptModal
          isOpen={!!receiptPayment}
          onClose={() => setReceiptPayment(null)}
          payment={receiptPayment}
          customer={data.customer}
          invoiceNumber={data.invoice_number}
        />
      )}

      {reversePayment && (
        <ReversePaymentModal
          isOpen={!!reversePayment}
          onClose={() => setReversePayment(null)}
          payment={reversePayment}
          onSuccess={loadInvoice}
        />
      )}
    </div>
  )
}
