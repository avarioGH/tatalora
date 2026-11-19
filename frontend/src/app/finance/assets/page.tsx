"use client"

import React, { useState, useEffect, useRef } from "react"
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
  Search, Plus, Download, Upload, FileSpreadsheet, Loader2, Building, RefreshCw, Eye, Trash2, ChevronDown, FolderOpen
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
import { api, AssetAPI } from "@/lib/api"
import { downloadCSV, parseCSV } from "@/lib/csv-helper"

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Daftar Aset")
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Modal Create Asset
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [assetDetails, setAssetDetails] = useState<any>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const openAssetDetails = async (asset: any) => {
    setSelectedAsset(asset)
    setDetailsModalOpen(true)
    try {
      const data = await AssetAPI.getAssetFinancials(asset.id)
      setAssetDetails(data)
    } catch (e) {
      console.error(e)
    }
  }

  const [form, setForm] = useState({
    asset_code: "",
    asset_name: "",
    category_id: "",
    purchase_price: "",
    salvage_value: "0",
    purchase_date: new Date().toISOString().split("T")[0],
    depreciation_start_date: new Date().toISOString().split("T")[0],
    depreciation_method: "Garis Lurus",
    useful_life: "48", // 4 tahun
    asset_account_id: "",
    accum_deprec_account_id: "",
    deprec_expense_account_id: "",
    condition: "GOOD",
    location: "",
    notes: ""
  })

  // Modal Import CSV
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const [resAssets, resCats, resAccs] = await Promise.all([
        AssetAPI.getAssets().catch(() => []),
        api.get('/asset/categories').catch(() => ({ data: [] })),
        api.get('/gl/accounts').catch(() => ({ data: [] }))
      ])
      setAssets(Array.isArray(resAssets) ? resAssets : [])
      setCategories(Array.isArray(resCats.data) ? resCats.data : [])
      setAccounts(Array.isArray(resAccs.data) ? resAccs.data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const filteredAssets = assets.filter(item => {
    const query = search.toLowerCase()
    return (
      item.asset_name?.toLowerCase().includes(query) ||
      item.asset_code?.toLowerCase().includes(query) ||
      item.category?.name?.toLowerCase().includes(query)
    )
  })

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Tanggal Akuisisi",
      "Barang / Nama Aset",
      "Kode Aset",
      "Kategori",
      "Biaya Akuisisi",
      "Nilai Buku",
      "Metode Penyusutan",
      "Status"
    ]
    const rows = filteredAssets.map(a => [
      a.purchase_date ? new Date(a.purchase_date).toLocaleDateString('id-ID') : '-',
      a.asset_name || '',
      a.asset_code || '',
      a.category?.name || 'Aset Tetap',
      a.purchase_price || 0,
      a.current_value !== undefined ? a.current_value : (a.purchase_price || 0),
      a.depreciation_method || 'Garis Lurus',
      a.status || 'ACTIVE'
    ])
    downloadCSV(`aset_tetap_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  // Template Download
  const handleDownloadTemplate = () => {
    const headers = ["Kode Aset", "Nama Aset", "Biaya Akuisisi", "Tanggal (YYYY-MM-DD)", "Masa Manfaat (Bulan)"]
    const sampleRows = [
      ["AST-001", "Mesin Gergaji Bandsaw 42 Inch", "185000000", "2026-01-15", "96"],
      ["AST-002", "Forklift Toyota 3 Ton Diesel", "240000000", "2026-03-10", "60"]
    ]
    downloadCSV("template_impor_aset.csv", headers, sampleRows)
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
      const payloadAssets = importPreview.rows.map(r => ({
        asset_code: r[0] || `AST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        asset_name: r[1] || 'Aset Impor',
        purchase_price: Number(r[2]) || 0,
        purchase_date: r[3] || new Date().toISOString().slice(0, 10),
        useful_life: Number(r[4]) || 48
      }))

      await api.post('/asset/bulk-import', { assets: payloadAssets })
      alert(`Berhasil mengimpor ${payloadAssets.length} aset ke database!`)
      setImportModalOpen(false)
      setImportFile(null)
      setImportPreview(null)
      fetchAssets()
    } catch (e: any) {
      alert("Gagal mengimpor aset: " + (e.response?.data?.message || e.message))
    } finally {
      setImporting(false)
    }
  }

  // Create Asset Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.asset_name) {
      alert("Nama barang/aset wajib diisi!")
      return
    }
    setSubmitting(true)
    try {
      await api.post('/asset', form)
      alert("Aset berhasil ditambahkan ke database!")
      setCreateModalOpen(false)
      setForm({
        asset_code: "",
        asset_name: "",
        category_id: "",
        purchase_price: "",
        salvage_value: "0",
        purchase_date: new Date().toISOString().split("T")[0],
        depreciation_start_date: new Date().toISOString().split("T")[0],
        depreciation_method: "Garis Lurus",
        useful_life: "48",
        asset_account_id: "",
        accum_deprec_account_id: "",
        deprec_expense_account_id: "",
        condition: "GOOD",
        location: "",
        notes: ""
      })
      fetchAssets()
    } catch (e: any) {
      alert("Gagal menambahkan aset: " + (e.response?.data?.message || e.message))
    } finally {
      setSubmitting(false)
    }
  }

  const totalAcquisition = assets.reduce((sum, a) => sum + (Number(a.purchase_price) || 0), 0)
  const totalBookValue = assets.reduce((sum, a) => sum + (Number(a.current_value) || Number(a.purchase_price) || 0), 0)

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building className="w-7 h-7 text-indigo-600" />
            Pengaturan Aset Tetap
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola data aktiva tetap, penyusutan berkala, dan nilai buku perusahaan sesuai standar akuntansi keuangan SAK EMKM.
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
            onClick={() => {
              setForm(prev => ({ ...prev, asset_code: `AST-${Math.floor(100000 + Math.random() * 900000)}` }))
              setCreateModalOpen(true)
            }}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Total Aset Terdaftar</p>
            <p className="text-2xl font-bold text-foreground">{assets.length} Unit</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Total Biaya Akuisisi</p>
            <p className="text-2xl font-bold text-foreground">{formatIDR(totalAcquisition)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border bg-card border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Total Nilai Buku Saat Ini</p>
            <p className="text-2xl font-bold text-emerald-600">{formatIDR(totalBookValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Container */}
      <div className="bg-card rounded-md shadow-sm border border-border">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 px-4 border-b border-border overflow-x-auto">
          {["Daftar Aset", "Penyusutan", "Aset Dijual/Dilepas"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={fetchAssets} className="gap-1.5 h-9 bg-background">
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan
            </Button>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari aset atau kode..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background h-9 text-sm"
            />
          </div>
        </div>

        {/* Assets Table (Exact Mekari Jurnal Columns) */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Memuat data aset dari database...
            </div>
          ) : activeTab === "Penyusutan" ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Jadwal & Riwayat Penyusutan Aset</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Penyusutan dihitung otomatis setiap akhir periode bulan/tahun buku berdasarkan metode garis lurus. Saat ini belum ada depresiasi yang diposting ke jurnal buku besar untuk periode berjalan.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("Daftar Aset")}>
                  Kembali ke Daftar Aset Tetap
                </Button>
              </div>
            </div>
          ) : activeTab === "Aset Dijual/Dilepas" ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Belum Ada Aset yang Dilepas atau Dijual</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Semua aset tetap perusahaan masih aktif beroperasi. Bila aset rusak total atau dilepas, catat disposisi melalui menu tindakan aset untuk menghentikan akumulasi beban depresiasi.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("Daftar Aset")}>
                  Lihat Aset Aktif
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] pl-4"><input type="checkbox" className="rounded border-border" /></TableHead>
                  <TableHead>Tanggal Akuisisi</TableHead>
                  <TableHead>Kode Aset</TableHead>
                  <TableHead>Barang / Nama Aset</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Biaya Akuisisi</TableHead>
                  <TableHead className="text-right">Nilai Buku</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                      <p className="text-base font-medium">Belum ada aset tetap yang tercatat.</p>
                      <p className="text-xs mt-1 text-muted-foreground">Klik &quot;Tambah Aset Baru&quot; atau &quot;Impor&quot; untuk mencatat inventaris aset tetap perusahaan.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map(a => (
                    <TableRow key={a.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="pl-4"><input type="checkbox" className="rounded border-border" /></TableCell>
                      <TableCell>{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-indigo-600">{a.asset_code}</TableCell>
                      <TableCell className="font-medium text-foreground">{a.asset_name}</TableCell>
                      <TableCell><Badge variant="outline">{a.category?.name || 'Aset Tetap'}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(a.purchase_price)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{formatIDR(a.current_value !== undefined ? a.current_value : a.purchase_price)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.depreciation_method || 'Garis Lurus'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openAssetDetails(a)}>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={a.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-muted text-muted-foreground'}>
                          {a.status === 'ACTIVE' ? 'Aktif' : a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

      </div>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl bg-card">
          <DialogHeader>
            <DialogTitle>Detail Keuangan & Penyusutan: {selectedAsset?.asset_name}</DialogTitle>
          </DialogHeader>
          {assetDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-md text-center">
                  <p className="text-xs text-muted-foreground">Harga Perolehan</p>
                  <p className="font-bold">{formatIDR(assetDetails.purchase_price)}</p>
                </div>
                <div className="p-3 bg-muted rounded-md text-center">
                  <p className="text-xs text-muted-foreground">Akumulasi Depresiasi</p>
                  <p className="font-bold text-rose-600">{formatIDR(assetDetails.accumulated_depreciation)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-md text-center border border-emerald-100">
                  <p className="text-xs text-emerald-600">Nilai Buku</p>
                  <p className="font-bold text-emerald-700">{formatIDR(assetDetails.purchase_price - assetDetails.accumulated_depreciation)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Beban Depresiasi</TableHead>
                    <TableHead className="text-right">Akumulasi</TableHead>
                    <TableHead className="text-right">Nilai Buku Akhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetDetails.asset_depreciations?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.period}</TableCell>
                      <TableCell className="text-right">{formatIDR(d.amount)}</TableCell>
                      <TableCell className="text-right">{formatIDR(d.accumulated_depreciation)}</TableCell>
                      <TableCell className="text-right">{formatIDR(d.closing_book_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">Memuat data...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Asset Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Tambah Aset Tetap Baru
            </DialogTitle>
            <DialogDescription>
              Catat perolehan aktiva tetap baru dan konfigurasi nilai buku awal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode Aset *</Label>
                <Input 
                  value={form.asset_code} 
                  onChange={e => setForm({ ...form, asset_code: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori Aset</Label>
                <Select 
                  value={form.category_id} 
                  onValueChange={val => setForm({ ...form, category_id: val || "" })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nama Barang / Aset *</Label>
              <Input 
                value={form.asset_name} 
                onChange={e => setForm({ ...form, asset_name: e.target.value })} 
                placeholder="e.g. Mesin Boiler Biomassa 5 Ton" 
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal Akuisisi</Label>
                <Input 
                  type="date" 
                  value={form.purchase_date} 
                  onChange={e => setForm({ ...form, purchase_date: e.target.value })} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Biaya Akuisisi (Rp) *</Label>
                <Input 
                  type="number" 
                  value={form.purchase_price} 
                  onChange={e => setForm({ ...form, purchase_price: e.target.value })} 
                  placeholder="0" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nilai Residu / Sisa (Rp)</Label>
                <Input 
                  type="number" 
                  value={form.salvage_value} 
                  onChange={e => setForm({ ...form, salvage_value: e.target.value })} 
                  placeholder="0" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mulai Disusutkan</Label>
                <Input 
                  type="date" 
                  value={form.depreciation_start_date} 
                  onChange={e => setForm({ ...form, depreciation_start_date: e.target.value })} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Metode Penyusutan</Label>
                <Select 
                  value={form.depreciation_method} 
                  onValueChange={val => setForm({ ...form, depreciation_method: val || "Garis Lurus" })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="Garis Lurus">Garis Lurus (Straight Line)</SelectItem>
                    <SelectItem value="Saldo Menurun">Saldo Menurun (Declining)</SelectItem>
                    <SelectItem value="Tanpa Penyusutan">Tanpa Penyusutan (Tanah)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Masa Manfaat (Bulan)</Label>
                <Input 
                  type="number" 
                  value={form.useful_life} 
                  onChange={e => setForm({ ...form, useful_life: e.target.value })} 
                  placeholder="48" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/50 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Akun Aset Tetap</Label>
                <Select 
                  value={form.asset_account_id} 
                  onValueChange={val => setForm({ ...form, asset_account_id: val || "" })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih Akun Aset Tetap..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {accounts.filter(a => a.account_code?.startsWith('1-2') || a.account_type?.name?.includes('Tetap')).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Akun Akumulasi Penyusutan</Label>
                <Select 
                  value={form.accum_deprec_account_id} 
                  onValueChange={val => setForm({ ...form, accum_deprec_account_id: val || "" })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih Akun Akumulasi..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {accounts.filter(a => a.account_name?.includes('Akumulasi') || a.account_code?.startsWith('1-20002') || a.account_code?.startsWith('1-20004')).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Akun Beban Penyusutan</Label>
              <Select 
                value={form.deprec_expense_account_id} 
                onValueChange={val => setForm({ ...form, deprec_expense_account_id: val || "" })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Pilih Akun Beban Penyusutan..." />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {accounts.filter(a => a.account_name?.includes('Penyusutan') && a.account_code?.startsWith('6-')).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Lokasi / Keterangan</Label>
              <Input 
                value={form.location} 
                onChange={e => setForm({ ...form, location: e.target.value })} 
                placeholder="Gudang Utama / Pabrik Pengolahan" 
              />
            </div>

            {/* Depreciation Preview */}
            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-2">
              <Label className="text-xs font-semibold text-indigo-700">Simulasi Penyusutan (Tahun Pertama)</Label>
              <div className="grid grid-cols-2 gap-4 text-xs text-indigo-900">
                <div>
                  <p>Beban per Bulan: <span className="font-bold">{formatIDR(Math.max(0, (Number(form.purchase_price) - Number(form.salvage_value)) / Number(form.useful_life)))}</span></p>
                </div>
                <div>
                  <p>Estimasi Nilai Buku Akhir: <span className="font-bold">{formatIDR(Number(form.salvage_value))}</span></p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Aset
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
              Impor Data Aset Tetap
            </DialogTitle>
            <DialogDescription>
              Unggah file CSV untuk mengimpor daftar aset secara massal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
              <div>
                <p className="text-sm font-medium">Format Template CSV Standar</p>
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

            {/* Depreciation Preview */}
            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-2">
              <Label className="text-xs font-semibold text-indigo-700">Simulasi Penyusutan (Tahun Pertama)</Label>
              <div className="grid grid-cols-2 gap-4 text-xs text-indigo-900">
                <div>
                  <p>Beban per Bulan: <span className="font-bold">{formatIDR(Math.max(0, (Number(form.purchase_price) - Number(form.salvage_value)) / Number(form.useful_life)))}</span></p>
                </div>
                <div>
                  <p>Estimasi Nilai Buku Akhir: <span className="font-bold">{formatIDR(Number(form.salvage_value))}</span></p>
                </div>
              </div>
            </div>

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
