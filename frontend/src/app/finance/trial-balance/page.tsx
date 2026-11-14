"use client"

import React, { useState, useEffect } from "react"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, Download, RefreshCw, FileSpreadsheet, ArrowLeft, CheckCircle2, AlertTriangle
} from "lucide-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function TrialBalancePage() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchTrialBalance = async () => {
    setLoading(true)
    try {
      const res = await api.get('/gl/trial-balance')
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrialBalance()
  }, [])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const filtered = data.filter(item => {
    const q = search.toLowerCase()
    return (
      (item.account_code && item.account_code.toLowerCase().includes(q)) ||
      (item.account_name && item.account_name.toLowerCase().includes(q))
    )
  })

  const totalDebit = filtered.reduce((sum, it) => sum + (Number(it.debit) || 0), 0)
  const totalCredit = filtered.reduce((sum, it) => sum + (Number(it.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
              Neraca Saldo (Trial Balance)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Daftar saldo debit dan kredit dari setiap akun untuk memastikan keseimbangan pembukuan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTrialBalance} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50/50 border-emerald-100">
          <span className="text-xs font-semibold text-emerald-800 uppercase">Total Debit</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalDebit)}</div>
        </Card>
        <Card className="p-4 bg-rose-50/50 border-rose-100">
          <span className="text-xs font-semibold text-rose-800 uppercase">Total Kredit</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{formatCurrency(totalCredit)}</div>
        </Card>
        <Card className={`p-4 ${isBalanced ? 'bg-indigo-50/50 border-indigo-100' : 'bg-amber-50/50 border-amber-200'}`}>
          <span className="text-xs font-semibold text-slate-700 uppercase">Status Keseimbangan</span>
          <div className="text-sm font-semibold mt-1 flex items-center gap-1.5">
            {isBalanced ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Seimbang (Balanced)
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Selisih {formatCurrency(Math.abs(totalDebit - totalCredit))}
              </span>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Rincian Akun</CardTitle>
              <CardDescription>Menampilkan saldo berjalan debit dan kredit per akun.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Cari kode atau nama akun..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[160px]">Kode Akun</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead className="text-right w-[200px]">Debit</TableHead>
                  <TableHead className="text-right w-[200px]">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                        Memuat data neraca saldo...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                      Belum ada pergerakan transaksi akuntansi.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item, idx) => (
                    <TableRow key={item.account_id || idx} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-slate-900">{item.account_code || '-'}</TableCell>
                      <TableCell className="text-slate-700">{item.account_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {Number(item.debit) > 0 ? formatCurrency(Number(item.debit)) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {Number(item.credit) > 0 ? formatCurrency(Number(item.credit)) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {filtered.length > 0 && (
                  <TableRow className="bg-slate-50/80 font-bold border-t-2">
                    <TableCell colSpan={2} className="text-right uppercase text-xs text-slate-600">Total Akhir</TableCell>
                    <TableCell className="text-right text-emerald-700">{formatCurrency(totalDebit)}</TableCell>
                    <TableCell className="text-right text-rose-700">{formatCurrency(totalCredit)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
