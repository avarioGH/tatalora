"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Loader2, Download, Calendar, DollarSign, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"

export default function AccountsReceivableAgingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [asOfDate, setAsOfDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }))

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const res = await api.get('/invoices?type=AR&limit=100').catch(() => ({ data: { data: [] } }))
      const list = res.data?.data || res.data || []
      setInvoices(list.filter((inv: any) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  // Calculate Aging Buckets
  const asOf = new Date(asOfDate).getTime()
  let currentTotal = 0
  let bucket1_30 = 0
  let bucket31_60 = 0
  let bucket61_90 = 0
  let bucketOver90 = 0

  const agedItems = invoices.map(inv => {
    const dueDate = new Date(inv.due_date || inv.invoice_date || inv.createdAt).getTime()
    const diffDays = Math.floor((asOf - dueDate) / (1000 * 60 * 60 * 24))
    const remaining = Number(inv.remaining_amount !== undefined && inv.remaining_amount !== null ? inv.remaining_amount : inv.total_amount)

    let current = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let bOver = 0

    if (diffDays <= 0) {
      current = remaining
      currentTotal += remaining
    } else if (diffDays <= 30) {
      b1 = remaining
      bucket1_30 += remaining
    } else if (diffDays <= 60) {
      b2 = remaining
      bucket31_60 += remaining
    } else if (diffDays <= 90) {
      b3 = remaining
      bucket61_90 += remaining
    } else {
      bOver = remaining
      bucketOver90 += remaining
    }

    return {
      id: inv.id,
      number: inv.invoice_number,
      customer: inv.customer?.name || "Pelanggan Umum",
      dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : "-",
      daysOverdue: Math.max(0, diffDays),
      total: Number(inv.total_amount || 0),
      remaining,
      current,
      b1,
      b2,
      b3,
      bOver
    }
  })

  const grandTotal = currentTotal + bucket1_30 + bucket31_60 + bucket61_90 + bucketOver90

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Laporan Umur Piutang (AR Aging Report)</h1>
            <p className="text-muted-foreground text-sm">Analisis tagihan penjualan yang belum tertagih per kelompok umur jatuh tempo</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Download className="w-4 h-4" /> Cetak / Export PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-medium">Belum Jatuh Tempo</CardDescription>
            <CardTitle className="text-lg font-bold text-emerald-600">{formatIDR(currentTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-medium">1 - 30 Hari</CardDescription>
            <CardTitle className="text-lg font-bold text-blue-600">{formatIDR(bucket1_30)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-medium">31 - 60 Hari</CardDescription>
            <CardTitle className="text-lg font-bold text-amber-600">{formatIDR(bucket31_60)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-medium">61 - 90 Hari</CardDescription>
            <CardTitle className="text-lg font-bold text-orange-600">{formatIDR(bucket61_90)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border shadow-xs bg-card border-rose-200">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-medium text-rose-600">&gt; 90 Hari</CardDescription>
            <CardTitle className="text-lg font-bold text-rose-600">{formatIDR(bucketOver90)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold">Rincian Faktur Piutang Belum Tertagih</CardTitle>
            <span className="text-xs font-semibold text-primary">Total Piutang: {formatIDR(grandTotal)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : agedItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Tidak ada piutang terbuka saat ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">No. Faktur</TableHead>
                    <TableHead className="font-semibold">Pelanggan</TableHead>
                    <TableHead className="font-semibold">Jatuh Tempo</TableHead>
                    <TableHead className="font-semibold text-right">Belum Tempo</TableHead>
                    <TableHead className="font-semibold text-right">1-30 Hari</TableHead>
                    <TableHead className="font-semibold text-right">31-60 Hari</TableHead>
                    <TableHead className="font-semibold text-right">61-90 Hari</TableHead>
                    <TableHead className="font-semibold text-right">&gt; 90 Hari</TableHead>
                    <TableHead className="font-semibold text-right">Sisa Piutang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agedItems.map(item => (
                    <TableRow key={item.id} className="border-b hover:bg-muted/20">
                      <TableCell className="font-mono font-medium text-primary">{item.number}</TableCell>
                      <TableCell className="font-medium">{item.customer}</TableCell>
                      <TableCell className="text-muted-foreground">{item.dueDate}</TableCell>
                      <TableCell className="text-right">{item.current > 0 ? formatIDR(item.current) : "-"}</TableCell>
                      <TableCell className="text-right text-blue-600">{item.b1 > 0 ? formatIDR(item.b1) : "-"}</TableCell>
                      <TableCell className="text-right text-amber-600">{item.b2 > 0 ? formatIDR(item.b2) : "-"}</TableCell>
                      <TableCell className="text-right text-orange-600">{item.b3 > 0 ? formatIDR(item.b3) : "-"}</TableCell>
                      <TableCell className="text-right text-rose-600 font-semibold">{item.bOver > 0 ? formatIDR(item.bOver) : "-"}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">{formatIDR(item.remaining)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-bold border-t">
                    <TableCell colSpan={3}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatIDR(currentTotal)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatIDR(bucket1_30)}</TableCell>
                    <TableCell className="text-right text-amber-600">{formatIDR(bucket31_60)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatIDR(bucket61_90)}</TableCell>
                    <TableCell className="text-right text-rose-600">{formatIDR(bucketOver90)}</TableCell>
                    <TableCell className="text-right text-primary">{formatIDR(grandTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
