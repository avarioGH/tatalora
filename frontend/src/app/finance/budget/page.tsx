"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Plus, Target, TrendingUp, AlertCircle, Calendar, ArrowRight, 
  Download, Filter, Search, Loader2, Trash2, RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function BudgetManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeYear, setActiveYear] = useState("2026")
  const [searchTerm, setSearchTerm] = useState("")
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category_id: "",
    period: "2026",
    budget_amount: "",
    used_amount: ""
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [budgetRes, catRes] = await Promise.all([
        api.get('/finance/budgets').catch(() => ({ data: [] })),
        api.get('/finance/categories').catch(() => ({ data: [] })),
      ])

      const rawBudgets = Array.isArray(budgetRes.data) ? budgetRes.data : budgetRes.data?.data || []
      const rawCategories = Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || []

      setBudgets(rawBudgets)
      setCategories(rawCategories)
    } catch (err) {
      console.error("Error loading budget data:", err)
      toast.error("Gagal memuat data anggaran riil")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category_id || !formData.budget_amount) {
      toast.error("Pilih kategori pos anggaran dan masukkan jumlah target anggaran")
      return
    }

    setSubmitting(true)
    try {
      await api.post('/finance/budgets', {
        category_id: formData.category_id,
        period: formData.period || activeYear,
        budget_amount: Number(formData.budget_amount),
        used_amount: Number(formData.used_amount || 0)
      })
      toast.success("Pos anggaran berhasil ditambahkan!")
      setIsDialogOpen(false)
      setFormData({
        category_id: "",
        period: "2026",
        budget_amount: "",
        used_amount: ""
      })
      loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan anggaran")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Hapus pos anggaran ini?")) return
    try {
      await api.delete(`/finance/budgets/${id}`)
      toast.success("Pos anggaran dihapus")
      loadData()
    } catch (err) {
      toast.error("Gagal menghapus pos anggaran")
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const totalBudget = budgets.reduce((acc, b) => acc + (Number(b.budget_amount) || 0), 0)
  const totalActual = budgets.reduce((acc, b) => acc + (Number(b.used_amount) || 0), 0)
  const totalVariance = totalBudget - totalActual
  const overallPercentage = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0

  const filtered = budgets.filter(b => {
    const catName = b.category?.name || ""
    const catType = b.category?.type || ""
    const term = searchTerm.toLowerCase()
    return catName.toLowerCase().includes(term) || catType.toLowerCase().includes(term)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-6 w-6 text-primary" />
            </div>
            Anggaran Perusahaan (Budgeting)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rencanakan target anggaran biaya, pantau realisasi belanja aktual, dan kendalikan varians keuangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 bg-card border-border" onClick={loadData}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Buat Anggaran Baru
            </Button>
            <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
              <form onSubmit={handleCreateBudget}>
                <DialogHeader>
                  <DialogTitle>Tambah Pos Anggaran Riil</DialogTitle>
                  <DialogDescription>
                    Pilih kategori dari master Chart of Accounts/Kategori Keuangan dan tentukan plafon anggarannya.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 text-sm">
                  <div>
                    <label className="block font-semibold mb-1">Kategori / Pos Akun</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      required
                    >
                      <option value="">-- Pilih Pos Kategori Akun --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Periode Anggaran</label>
                    <Input
                      type="text"
                      placeholder="Contoh: 2026 atau 2026-Q1"
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      className="bg-background border-border text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Target Plafon Anggaran (Rp)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.budget_amount}
                      onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                      className="bg-background border-border text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Realisasi Belanja Awal (Opsional - Rp)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.used_amount}
                      onChange={(e) => setFormData({ ...formData, used_amount: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                    {submitting ? "Menyimpan..." : "Simpan Anggaran"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Plafon Anggaran</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{formatIDR(totalBudget)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tahun Fiskal {activeYear}</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Realisasi Aktual</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">{formatIDR(totalActual)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex-1">
                <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, overallPercentage)}%` }} />
              </div>
              <span className="text-xs font-semibold">{overallPercentage}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Sisa Anggaran (Variance)</CardDescription>
            <CardTitle className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatIDR(totalVariance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalVariance >= 0 ? 'Surplus / Belum Terpakai' : 'Overbudget / Melebihi Anggaran'}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Jumlah Pos Akun</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{budgets.length} Pos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Database Supabase PostgreSQL</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border shadow-xs bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari kategori akun..." 
                className="pl-9 bg-muted border-border h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Periode Anggaran:</span>
            <Badge variant="outline" className="px-3 py-1 font-semibold">{activeYear}</Badge>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Nama Pos Anggaran</TableHead>
                  <TableHead className="font-semibold">Tipe Akun</TableHead>
                  <TableHead className="font-semibold">Periode</TableHead>
                  <TableHead className="text-right font-semibold">Target Plafon</TableHead>
                  <TableHead className="text-right font-semibold">Realisasi Aktual</TableHead>
                  <TableHead className="w-36 text-center font-semibold">Persentase</TableHead>
                  <TableHead className="text-right font-semibold">Sisa (Varians)</TableHead>
                  <TableHead className="w-16 text-center font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Memuat data anggaran riil dari database...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Belum ada data anggaran yang tersimpan. Klik tombol <strong>"Buat Anggaran Baru"</strong> di atas untuk membuat pos anggaran riil.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const budgetAmt = Number(item.budget_amount) || 0
                    const actualAmt = Number(item.used_amount) || 0
                    const pct = budgetAmt > 0 ? Math.round((actualAmt / budgetAmt) * 100) : 0
                    const diff = Number(item.remaining_amount ?? (budgetAmt - actualAmt))
                    const isOver = diff < 0

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/20 border-b">
                        <TableCell className="font-medium text-foreground">
                          {item.category?.name || "Pos Anggaran Tanpa Nama"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {item.category?.type || "Beban"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.period || "2026"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatIDR(budgetAmt)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {formatIDR(actualAmt)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex-1">
                              <div 
                                className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-primary'}`} 
                                style={{ width: `${Math.min(100, pct)}%` }} 
                              />
                            </div>
                            <span className={`text-xs font-semibold ${isOver ? 'text-rose-500' : 'text-muted-foreground'}`}>
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${isOver ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {formatIDR(diff)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteBudget(item.id)}
                            className="text-muted-foreground hover:text-rose-500 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
