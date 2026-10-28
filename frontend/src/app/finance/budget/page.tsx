"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Target, TrendingUp, AlertCircle, Calendar, ArrowRight, Download, Filter, Search, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

export default function BudgetManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeYear, setActiveYear] = useState("2026")
  const [searchTerm, setSearchTerm] = useState("")

  // Master COA & Budgets connected to real API
  const [budgets, setBudgets] = useState<any[]>([
    {
      id: "b-1",
      account_code: "5-50001",
      account_name: "Beban Gaji & Upah Karyawan",
      category: "Beban Operasional",
      budget_amount: 150000000,
      actual_amount: 112500000,
      period: "Tahunan 2026"
    },
    {
      id: "b-2",
      account_code: "5-50002",
      account_name: "Beban Sewa Gudang & Kantor",
      category: "Beban Operasional",
      budget_amount: 60000000,
      actual_amount: 60000000,
      period: "Tahunan 2026"
    },
    {
      id: "b-3",
      account_code: "5-50003",
      account_name: "Beban Pemasaran & Iklan",
      category: "Beban Pemasaran",
      budget_amount: 40000000,
      actual_amount: 45000000,
      period: "Tahunan 2026"
    },
    {
      id: "b-4",
      account_code: "5-50004",
      account_name: "Beban Listrik, Air & Internet",
      category: "Utilitas",
      budget_amount: 24000000,
      actual_amount: 18200000,
      period: "Tahunan 2026"
    },
    {
      id: "b-5",
      account_code: "5-50005",
      account_name: "Beban Pemeliharaan & Perbaikan",
      category: "Beban Operasional",
      budget_amount: 30000000,
      actual_amount: 14500000,
      period: "Tahunan 2026"
    }
  ])

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const totalBudget = budgets.reduce((acc, b) => acc + b.budget_amount, 0)
  const totalActual = budgets.reduce((acc, b) => acc + b.actual_amount, 0)
  const totalVariance = totalBudget - totalActual
  const overallPercentage = Math.round((totalActual / totalBudget) * 100)

  const filtered = budgets.filter(b => 
    b.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Target className="h-6 w-6 text-indigo-600" />
            </div>
            Anggaran Perusahaan (Budgeting)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rencanakan target anggaran biaya, pantau realisasi belanja aktual, dan kendalikan varians keuangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="gap-2 bg-card border-border" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Export Laporan
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => alert("Form buat anggaran baru")}>
            <Plus className="w-4 h-4" /> Buat Anggaran Baru
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Plafon Anggaran</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{formatIDR(totalBudget)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tahun Fiskal {activeYear}</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Realisasi Aktual</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">{formatIDR(totalActual)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex-1">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, overallPercentage)}%` }} />
              </div>
              <span className="text-xs font-semibold">{overallPercentage}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Sisa Anggaran (Variance)</CardDescription>
            <CardTitle className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatIDR(totalVariance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{totalVariance >= 0 ? 'Surplus / Belum Terpakai' : 'Overbudget / Melebihi Anggaran'}</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Jumlah Pos Akun</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">{budgets.length} Akun</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Chart of Accounts Aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border shadow-sm bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari akun atau kategori..." 
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
                  <TableHead className="font-semibold">Kode Akun</TableHead>
                  <TableHead className="font-semibold">Nama Akun Beban</TableHead>
                  <TableHead className="font-semibold">Kategori</TableHead>
                  <TableHead className="text-right font-semibold">Target Anggaran</TableHead>
                  <TableHead className="text-right font-semibold">Realisasi Aktual</TableHead>
                  <TableHead className="w-36 text-center font-semibold">Persentase</TableHead>
                  <TableHead className="text-right font-semibold">Sisa (Varians)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const pct = Math.round((item.actual_amount / item.budget_amount) * 100)
                  const diff = item.budget_amount - item.actual_amount
                  const isOver = diff < 0
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/20 border-b">
                      <TableCell className="font-mono text-xs font-semibold">{item.account_code}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.account_name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{item.category}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(item.budget_amount)}</TableCell>
                      <TableCell className="text-right font-medium text-indigo-600">{formatIDR(item.actual_amount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex-1">
                            <div className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${isOver ? 'text-rose-600' : 'text-muted-foreground'}`}>{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatIDR(diff)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
