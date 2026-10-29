"use client"

import React, { useState, useEffect, useRef } from "react"
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
  Search, Plus, Download, Upload, FileSpreadsheet, Loader2, BookOpen, RefreshCw, ChevronDown, Check, Lock, ArrowUpRight
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { downloadCSV, parseCSV } from "@/lib/csv-helper"

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountTypes, setAccountTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori")

  // Modal Create Account
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    account_code: "",
    account_name: "",
    account_type_id: "",
    currency: "IDR",
    is_header: false
  })

  // Modal Import CSV
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const [accRes, typeRes] = await Promise.all([
        api.get('/gl/accounts').catch(() => ({ data: [] })),
        api.get('/gl/account-types').catch(() => ({ data: [] }))
      ])
      setAccounts(Array.isArray(accRes.data) ? accRes.data : [])
      setAccountTypes(Array.isArray(typeRes.data) ? typeRes.data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const categories = ["Semua Kategori", "Kas & Bank", "Akun Piutang", "Persediaan", "Aktiva Lancar Lainnya", "Aktiva Tetap", "Akun Hutang", "Kewajiban Lancar Lainnya", "Modal", "Pendapatan", "Beban Pokok Pendapatan", "Beban Operasional"]

  const filteredAccounts = accounts.filter(acc => {
    const q = search.toLowerCase()
    const matchesSearch = 
      acc.account_code?.toLowerCase().includes(q) ||
      acc.account_name?.toLowerCase().includes(q) ||
      acc.account_type?.name?.toLowerCase().includes(q)

    if (!matchesSearch) return false

    if (selectedCategory !== "Semua Kategori") {
      return acc.account_type?.name?.toLowerCase().includes(selectedCategory.toLowerCase())
    }

    return true
  })

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Kode Akun", "Nama Akun", "Kategori Akun", "Saldo Normal", "Mata Uang", "Tipe"]
    const rows = filteredAccounts.map(a => [
      a.account_code || '',
      a.account_name || '',
      a.account_type?.name || 'Umum',
      a.account_type?.normal_balance || 'Debit',
      a.currency || 'IDR',
      a.is_header ? 'Header' : 'Sub-Akun'
    ])
    downloadCSV(`daftar_akun_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  // Download Template
  const handleDownloadTemplate = () => {
    const headers = ["Kode Akun", "Nama Akun", "Kategori Akun", "Saldo Awal", "Mata Uang"]
    const sampleRows = [
      ["1-10001", "Kas Kecil Operasional", "Kas & Bank", "5000000", "IDR"],
      ["1-10002", "Bank Mandiri Utama", "Kas & Bank", "450000000", "IDR"],
      ["1-10100", "Piutang Usaha", "Akun Piutang", "125000000", "IDR"],
      ["2-20100", "Hutang Usaha", "Akun Hutang", "80000000", "IDR"],
      ["4-40000", "Pendapatan Penjualan Log", "Pendapatan", "0", "IDR"]
    ]
    downloadCSV("template_daftar_akun.csv", headers, sampleRows)
  }

  // Handle File Selection
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
      const payloadAccounts = importPreview.rows.map(r => ({
        account_code: r[0] || `ACC-${Date.now()}`,
        account_name: r[1] || 'Akun Impor',
        currency: r[4] || 'IDR',
        is_header: false
      }))

      await api.post('/gl/accounts/bulk-import', { accounts: payloadAccounts })
      alert(`Berhasil mengimpor ${payloadAccounts.length} akun ke Bagan Akun!`)
      setImportModalOpen(false)
      setImportFile(null)
      setImportPreview(null)
      fetchAccounts()
    } catch (e: any) {
      alert("Gagal mengimpor akun: " + (e.response?.data?.message || e.message))
    } finally {
      setImporting(false)
    }
  }

  // Create Account Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.account_code || !form.account_name) {
      alert("Nomor akun dan nama akun wajib diisi!")
      return
    }
    setSubmitting(true)
    try {
      await api.post('/gl/accounts', form)
      alert("Akun baru berhasil didaftarkan ke Bagan Akun!")
      setCreateModalOpen(false)
      setForm({
        account_code: "",
        account_name: "",
        account_type_id: "",
        currency: "IDR",
        is_header: false
      })
      fetchAccounts()
    } catch (e: any) {
      alert("Gagal membuat akun: " + (e.response?.data?.message || e.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header persis Mekari Jurnal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Daftar Akun (Chart of Accounts)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bagan klasifikasi akun buku besar untuk pembukuan dan laporan keuangan otomatis sesuai standar PSAK.
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

          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Akun Baru</span>
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-card rounded-md shadow-sm border border-border">
        
        {/* Filter and Search Bar */}
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-border">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || "Semua Kategori")}>
              <SelectTrigger className="w-56 h-9 bg-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card">
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchAccounts} className="gap-1.5 h-9 bg-background">
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan
            </Button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari kode akun atau nama..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background h-9 text-sm"
            />
          </div>
        </div>

        {/* Chart of Accounts Table (Exact Mekari Jurnal Columns) */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat daftar akun dari database...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] pl-4">Kunci</TableHead>
                  <TableHead className="w-[140px]">Kode Akun</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead>Kategori Akun</TableHead>
                  <TableHead>Saldo Normal</TableHead>
                  <TableHead>Mata Uang</TableHead>
                  <TableHead className="text-right pr-4">Saldo (dalam IDR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <p className="text-base font-medium">Belum ada akun yang sesuai kriteria.</p>
                      <p className="text-xs mt-1 text-muted-foreground">Klik &quot;Buat Akun Baru&quot; atau &quot;Impor&quot; untuk menambahkan akun.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map(acc => (
                    <TableRow key={acc.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-4">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-indigo-600">
                        {acc.account_code}
                      </TableCell>
                      <TableCell className={`font-medium ${acc.is_header ? 'font-bold text-foreground' : 'text-foreground/90 pl-6'}`}>
                        {acc.account_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {acc.account_type?.name || 'Umum'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {acc.account_type?.normal_balance || 'Debit'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {acc.currency || 'IDR'}
                      </TableCell>
                      <TableCell className="text-right font-medium pr-4">
                        {formatIDR(0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

      </div>

      {/* Create Account Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Buat Akun Baru
            </DialogTitle>
            <DialogDescription>
              Tambahkan nomor dan nama akun ke bagan akun perusahaan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nomor / Kode Akun *</Label>
                <Input 
                  value={form.account_code} 
                  onChange={e => setForm({ ...form, account_code: e.target.value })} 
                  placeholder="e.g. 1-10001" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori Akun</Label>
                <Select 
                  value={form.account_type_id} 
                  onValueChange={val => setForm({ ...form, account_type_id: val || "" })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {accountTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.normal_balance})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nama Akun *</Label>
              <Input 
                value={form.account_name} 
                onChange={e => setForm({ ...form, account_name: e.target.value })} 
                placeholder="e.g. Kas Operasional Cabang" 
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Mata Uang</Label>
                <Input 
                  value={form.currency} 
                  onChange={e => setForm({ ...form, currency: e.target.value })} 
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input 
                  type="checkbox" 
                  id="is_header" 
                  checked={form.is_header} 
                  onChange={e => setForm({ ...form, is_header: e.target.checked })} 
                  className="rounded border-border" 
                />
                <Label htmlFor="is_header" className="text-xs font-normal cursor-pointer">
                  Jadikan sebagai Akun Induk (Header)
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Buat Akun
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Impor Bagan Akun (Chart of Accounts)
            </DialogTitle>
            <DialogDescription>
              Unggah file CSV untuk mengimpor seluruh bagan akun secara massal.
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
