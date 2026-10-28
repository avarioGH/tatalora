"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, Filter, Plus, Receipt, FileText, ChevronDown, Calendar, FolderOpen, Printer, Upload, Clock, Bell, Wallet
} from "lucide-react"
import { api } from "@/lib/api"

export default function ExpensesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = ["Semua", "Belum Dibayar", "Lunas"]

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res = await api.get('/finance/transactions?limit=100').catch(() => ({ data: [] }))
      const list = res.data?.data || res.data || []
      // Filter expenses / cash-out
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
    const matchesSearch = exp.transaction_no?.toLowerCase().includes(search.toLowerCase()) ||
      exp.description?.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false

    if (activeTab === "Belum Dibayar") return exp.status === 'Draft' || exp.status === 'Pending'
    if (activeTab === "Lunas") return exp.status === 'Approved' || exp.status === 'COMPLETED'
    return true
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Receipt className="h-6 w-6 text-violet-600" />
            </div>
            Biaya Operasional (Expenses)
          </h1>
          <p className="text-muted-foreground mt-1">Kelola dan pantau seluruh pengeluaran operasional perusahaan.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href="/finance/expenses/create">
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Tambah Biaya Baru
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari transaksi atau keterangan..." 
              className="pl-9 bg-muted border-border h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap
                  ${activeTab === tab 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Memuat data biaya...</div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Tidak ada data biaya operasional</h3>
              <p className="text-muted-foreground max-w-sm mb-4 text-xs">
                Mulai catat pengeluaran listrik, sewa, gaji, atau beban operasional lainnya.
              </p>
              <Link href="/finance/expenses/create">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                  + Catat Biaya Baru
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"><input type="checkbox" className="rounded border-gray-300" /></TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Keterangan / Kategori</TableHead>
                  <TableHead>Dibayar Dari</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Biaya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-muted/30">
                    <TableCell><input type="checkbox" className="rounded border-gray-300" /></TableCell>
                    <TableCell>{new Date(exp.transaction_date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="font-semibold text-violet-600">{exp.transaction_no}</TableCell>
                    <TableCell className="font-medium text-foreground">{exp.description || '-'}</TableCell>
                    <TableCell>{exp.cash_account?.name || 'Kas/Bank'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={exp.status === 'COMPLETED' || exp.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}>
                        {exp.status === 'COMPLETED' || exp.status === 'Approved' ? 'Lunas' : exp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">{formatIDR(exp.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
