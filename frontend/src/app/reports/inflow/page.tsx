'use client'
import { useState, useEffect } from 'react'
import { InventoryAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Search, RefreshCcw, PackagePlus, ArrowDownToLine } from 'lucide-react'

export default function InflowReportPage() {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<any>({ summary: {}, data: [] })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await InventoryAPI.getInflowReport(params)
      setReport(res)
    } catch (e) {
      setReport({ summary: {}, data: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData();
    const handleWhChange = () => fetchData();
    window.addEventListener('warehouse-changed', handleWhChange);
    return () => window.removeEventListener('warehouse-changed', handleWhChange);
  }, [])

  const filtered = (report.data || []).filter((t: any) =>
    !search ||
    t.tally_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.warehouse?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan Ikan Masuk</h1>
          <p className="text-sm text-muted-foreground">Histori semua penerimaan stok ikan</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Transaksi</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold">{report.summary?.totalTransactions ?? 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Item Masuk</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-blue-500" />
              <span className="text-3xl font-bold">{report.summary?.totalItems ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari no. tally / gudang..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Input type="date" className="w-auto" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input type="date" className="w-auto" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <Button onClick={fetchData} disabled={loading}>Tampilkan</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Tally</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Gudang</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Memuat data...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Belum ada data ikan masuk</TableCell></TableRow>
              ) : (
                filtered.flatMap((tally: any) =>
                  (tally.items || []).map((item: any, idx: number) => (
                    <TableRow key={`${tally.id}-${idx}`}>
                      {idx === 0 ? (
                        <>
                          <TableCell rowSpan={tally.items.length} className="font-mono text-sm align-top font-medium">{tally.tally_number}</TableCell>
                          <TableCell rowSpan={tally.items.length} className="text-sm align-top text-muted-foreground">
                            {tally.tally_date ? format(new Date(tally.tally_date), 'dd MMM yyyy', { locale: id }) : '-'}
                          </TableCell>
                          <TableCell rowSpan={tally.items.length} className="text-sm align-top">{tally.warehouse?.name || '-'}</TableCell>
                        </>
                      ) : null}
                      <TableCell>
                        <div className="text-sm font-medium">{item.product?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{item.product?.code}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">+{item.qty}</TableCell>
                      {idx === 0 ? (
                        <TableCell rowSpan={tally.items.length} className="align-top">
                          <Badge variant={tally.status === 'POSTED' ? 'default' : 'secondary'}>
                            {tally.status}
                          </Badge>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
