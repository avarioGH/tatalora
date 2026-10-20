"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FinanceAPI } from "@/lib/api"
import { ArrowDownRight, ArrowUpRight, Search, Download, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function MutasiKasPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const txRes = await FinanceAPI.getTransactions()
        setTransactions(txRes.data || [])
      } catch (error) {
        console.error("Database connection failed:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value)
  }

  const filteredData = transactions.filter(tx => 
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tx.transaction_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.reference_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mutasi Kas (Buku Kas)</h1>
          <p className="text-muted-foreground mt-1 text-sm">Riwayat seluruh arus kas masuk dan keluar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>Daftar Transaksi</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari referensi / deskripsi..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Referensi</th>
                  <th className="px-4 py-3 font-medium">Deskripsi</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium text-right">Masuk (In)</th>
                  <th className="px-4 py-3 font-medium text-right">Keluar (Out)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Tidak ada mutasi kas.</td></tr>
                ) : (
                  filteredData.map((tx, idx) => {
                    const isIncome = tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In';
                    return (
                      <tr key={idx} className="bg-card hover:bg-muted/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(tx.transaction_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {tx.transaction_no}
                        </td>
                        <td className="px-4 py-3">
                          {tx.description}
                          {tx.reference_type && <span className="block text-xs text-muted-foreground mt-0.5">Ref: {tx.reference_type}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-success">
                          {isIncome ? formatIDR(tx.total_amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-destructive">
                          {!isIncome ? formatIDR(tx.total_amount) : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
