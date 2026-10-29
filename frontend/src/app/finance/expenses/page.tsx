"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, Plus, Receipt, Download, Upload, FileSpreadsheet, Loader2, ChevronDown, CheckCircle2, RefreshCw, Eye, Trash2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { downloadCSV, parseCSV } from "@/lib/csv-helper"

export default function ExpensesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tabs = ["Semua", "Belum Dibayar", "Lunas"]

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res = await api.get('/finance/transactions?limit=100').catch(() => ({ data: [] }))
      const list = res.data?.data || res.data || []
      const filtered = list.filter((tx: any) => 
        tx.transaction_type === 'Expense' || 
        tx.transaction_type === 'Cash Out' || 
        tx.transaction_type === 'Transfer Out'
      )
      setExpenses(filtered)
    } catch (err) {
      console.error("Error loading expenses:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const filteredData = expenses.filter(exp => {
    const q = search.toLowerCase()
    const matchesSearch = 
      exp.transaction_no?.toLowerCase().includes(q) ||
      exp.description?.toLowerCase().includes(q) ||
      exp.category?.name?.toLowerCase().includes(q)

    if (!matchesSearch) return false

    if (activeTab === "Belum Dibayar") return exp.status === 'Draft' || exp.status === 'Pending' || exp.status === 'UNPAID'
    if (activeTab === "Lunas") return exp.status === 'Approved' || exp.status === 'COMPLETED' || exp.status === 'PAID'
    return true
  })

  // Export CSV (Exact Mekari Jurnal Columns)
  const handleExportCSV = () => {
    const headers = [
      "Tanggal",
      "Nomor",
      "Kategori",
      "Penerima",
      "Status",
      "Sisa Tagihan (dalam IDR)",
      "Total (dalam IDR)",
      "Tags"
    ]
    const rows = filteredData.map(e => [
      e.transaction_date ? new Date(e.transaction_date).toLocaleDateString('id-ID') : '-',
      e.transaction_no || '',
      e.category?.name || 'Operasional',
      e.payee || '-',
      e.status === 'Approved' || e.status === 'PAID' ? 'Lunas' : 'Belum Dibayar',
      e.status === 'Approved' || e.status === 'PAID' ? 0 : (e.amount || 0),
      e.amount || 0,
      e.tag || ''
    ])
    downloadCSV(`daftar_biaya_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  // Download Template
  const handleDownloadTemplate = () => {
    const headers = ["Nomor Biaya", "Tanggal (YYYY-MM-DD)", "Kategori", "Penerima", "Deskripsi", "Total (IDR)"]
    const sampleRows = [
      ["EXP/2026/001", "2026-10-29", "Beban Listrik & Air", "PLN Persero", "Pembayaran Listrik Pabrik", "8500000"],
      ["EXP/2026/002", "2026-10-29", "Beban Bahan Bakar", "Pertamina", "Solar Mesin Produksi 500L", "3400000"]
    ]
    downloadCSV("template_impor_biaya.csv", headers, sampleRows)
  }

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        setImportPreview(parseCSV(text))
      }
    }
    reader.readAsText(file)
  }

  // Process Import
  const handleProcessImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) return
    setImporting(true)
    try {
      let count = 0
      for (const r of importPreview.rows) {
        if (!r[5]) continue
        await api.post('/finance/transactions', {
          transaction_no: r[0] || `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          transaction_date: r[1] || new Date().toISOString().slice(0, 10),
          transaction_type: 'Expense',
          payee: r[3] || 'Penerima Biaya',
          description: r[4] || 'Biaya Operasional',
          amount: Number(r[5]) || 0,
          status: 'Approved'
        }).catch(console.error)
        count++
      }
      alert(`Berhasil mengimpor ${count} transaksi biaya!`)
      setImportModalOpen(false)
      setImportFile(null)
      setImportPreview(null)
      fetchExpenses()
    } catch (e: any) {
      alert("Gagal mengimpor biaya: " + (e.response?.data?.message || e.message))
    } finally {
      setImporting(false)
    }
  }

  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const unpaidExpense = expenses.filter(e => e.status !== 'Approved' && e.status !== 'PAID').reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const paidExpense = expenses.filter(e => e.status === 'Approved' || e.status === 'PAID').reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header persis Mekari Jurnal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Biaya Operasional (Expenses)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catat dan pantau seluruh pengeluaran kas, beban operasional, dan pembayaran biaya perusahaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            className="h-9 px-3.5 bg-background gap-1.5"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>Ekspor CSV</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setImportModalOpen(true)}
            className="h-9 px-3.5 bg-background gap-1.5"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span>Impor</span>
          </Button>

          <Link href="/finance/expenses/create">
            <Button className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium">
              <Plus className="w-4 h-4" />
              <span>Buat Biaya Baru</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border bg-card border-t-4 border-t-indigo-600">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Total Biaya Bulan Ini</p>
            <p className="text-2xl font-bold text-foreground">{formatIDR(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card border-t-4 border-t-amber-500">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Biaya Belum Dibayar</p>
            <p className="text-2xl font-bold text-amber-600">{formatIDR(unpaidExpense)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card border-t-4 border-t-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Biaya Lunas</p>
            <p className="text-2xl font-bold text-emerald-600">{formatIDR(paidExpense)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Container */}
      <div className="bg-card rounded-md shadow-sm border border-border">
        
        {/* Status Tab Bar */}
        <div className="flex items-center gap-6 px-4 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t 
                  ? 'border-indigo-600 text-indigo-600 font-semibold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-border">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={fetchExpenses} className="gap-1.5 h-9 bg-background">
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan
            </Button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari transaksi atau penerima..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background h-9 text-sm"
            />
          </div>
        </div>

        {/* Expenses Table (Exact Mekari Jurnal Columns) */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat data biaya operasional...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] pl-4"><input type="checkbox" className="rounded border-border" /></TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sisa Tagihan (dalam IDR)</TableHead>
                  <TableHead className="text-right pr-4">Total (dalam IDR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <p className="text-base font-medium">Belum ada data pengeluaran operasional.</p>
                      <p className="text-xs mt-1 text-muted-foreground">Klik &quot;Buat Biaya Baru&quot; atau &quot;Impor&quot; untuk mencatat biaya baru.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map(exp => (
                    <TableRow key={exp.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-4"><input type="checkbox" className="rounded border-border" /></TableCell>
                      <TableCell>{exp.transaction_date ? new Date(exp.transaction_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-indigo-600">
                        {exp.transaction_no}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {exp.category?.name || 'Operasional'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {exp.payee || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={exp.status === 'Approved' || exp.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}
                        >
                          {exp.status === 'Approved' || exp.status === 'PAID' ? 'Lunas' : 'Belum Dibayar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIDR(exp.status === 'Approved' || exp.status === 'PAID' ? 0 : (exp.amount || 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold pr-4">
                        {formatIDR(exp.amount || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

      </div>

      {/* Import CSV Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Impor Data Biaya Operasional
            </DialogTitle>
            <DialogDescription>
              Unggah file CSV untuk mengimpor pengeluaran biaya secara massal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
              <div>
                <p className="text-sm font-medium">Format Template CSV Mekari Jurnal</p>
                <p className="text-xs text-muted-foreground">Unduh format kolom yang sesuai standar sistem</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Unduh Template
              </Button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Klik untuk memilih file CSV</p>
              <p className="text-xs text-muted-foreground mt-1">
                {importFile ? importFile.name : "Mendukung format .csv"}
              </p>
            </div>

            {importPreview && importPreview.rows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Pratinjau ({importPreview.rows.length} baris terdeteksi):
                </p>
                <div className="max-h-48 overflow-auto border rounded text-xs">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        {importPreview.headers.map((h, i) => (
                          <th key={i} className="p-2 text-left font-medium border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-b">
                          {row.map((cell, ci) => (
                            <td key={ci} className="p-2">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setImportModalOpen(false)}>
                Batal
              </Button>
              <Button 
                onClick={handleProcessImport} 
                disabled={!importPreview || importPreview.rows.length === 0 || importing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                Proses Impor ({importPreview?.rows.length || 0})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
