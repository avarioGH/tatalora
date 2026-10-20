"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ReportsAPI } from "@/lib/api"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { Search, FileSpreadsheet, Download, FileText, Banknote, ShoppingCart, Percent } from "lucide-react"

export default function ProfitReport() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await ReportsAPI.getDynamicReport("sales", "gross-margin")
      setReport(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (format: string) => {
    const token = localStorage.getItem("erp_token")
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "https://api.erp.boostup.id"}/reports/sales/gross-margin/export?format=${format}&token=${token}`, "_blank")
  }

  const columns = report?.columns || [
    { header: "Nomor Faktur", key: "invoice_number" },
    { header: "Pelanggan", key: "customer" },
    { header: "Pendapatan", key: "revenue", type: "currency" },
    { header: "HPP (COGS)", key: "cogs", type: "currency" },
    { header: "Laba Kotor", key: "margin", type: "currency" }
  ]
  
  const data = report?.data || []
  const totals = report?.totals || {}

  const filtered = data.filter((row: any) => 
    Object.values(row).some((val: any) => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  )

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val)

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">Laporan Profit</h1>
          <p className="text-muted-foreground mt-1">Laporan Laba Kotor (Gross Margin) per transaksi penjualan.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("pdf")}><FileText className="w-4 h-4 mr-2" /> PDF</Button>
          <Button variant="outline" onClick={() => handleExport("xlsx")}><FileSpreadsheet className="w-4 h-4 mr-2" /> Excel</Button>
          <Button variant="outline" onClick={() => handleExport("csv")}><Download className="w-4 h-4 mr-2" /> CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.revenue ? formatCurrency(totals.revenue) : "Rp 0"}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center"><Banknote className="w-3 h-3 mr-1"/> Bersih setelah pajak</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total HPP (COGS)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.cogs ? formatCurrency(totals.cogs) : "Rp 0"}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center"><ShoppingCart className="w-3 h-3 mr-1"/> Harga Pokok Penjualan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Laba Kotor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totals.margin ? formatCurrency(totals.margin) : "Rp 0"}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center"><Percent className="w-3 h-3 mr-1"/> Margin: {totals.revenue ? Math.round((totals.margin / totals.revenue) * 100) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
          <div>
            <CardTitle>{report?.title || "Data Laba Kotor Penjualan"}</CardTitle>
            <CardDescription>Menampilkan selisih pendapatan dan harga modal (COGS) per faktur</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Cari transaksi..." 
              className="pl-8" 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col: any) => (
                    <TableHead key={col.key} className={col.type === "currency" ? "text-right" : ""}>{col.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length || 5} className="text-center h-24 text-muted-foreground">Memuat data laporan...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length || 5} className="text-center h-24 text-muted-foreground">
                      {search ? "Pencarian tidak ditemukan." : "Belum ada data penjualan tercatat."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row: any, i: number) => (
                    <TableRow key={i}>
                      {columns.map((col: any) => (
                        <TableCell key={col.key} className={col.type === "currency" ? "text-right font-medium" : ""}>
                          {col.type === "currency" 
                            ? (
                                <span className={col.key === "margin" && row[col.key] > 0 ? "text-green-600" : col.key === "margin" && row[col.key] < 0 ? "text-red-600" : ""}>
                                  {formatCurrency(row[col.key] || 0)}
                                </span>
                              )
                            : col.type === "date" && row[col.key]
                              ? new Date(row[col.key]).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                              : row[col.key] || "-"
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>
    </div>
  )
}
