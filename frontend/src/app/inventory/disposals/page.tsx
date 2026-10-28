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
  Search, Plus, Flame, Filter, ChevronDown, FolderOpen, Loader2
} from "lucide-react"
import { DisposalAPI } from "@/lib/api"

export default function DisposalsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [disposals, setDisposals] = useState<any[]>([])

  useEffect(() => {
    fetchDisposals()
  }, [])

  const fetchDisposals = async () => {
    setLoading(true)
    try {
      const res = await DisposalAPI.list().catch(() => [])
      const list = Array.isArray(res) ? res : (res?.data || [])
      setDisposals(list)
    } catch (err) {
      console.error("Error loading disposals:", err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "COMPLETED":
      case "Selesai": 
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 font-medium px-2.5 py-0.5">Selesai</Badge>
      case "PENDING":
      case "Menunggu Persetujuan": 
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-0 font-medium px-2.5 py-0.5">Menunggu Persetujuan</Badge>
      default: 
        return <Badge variant="outline">{status || 'Draft'}</Badge>
    }
  }

  const filteredDisposals = disposals.filter(d => {
    const s = search.toLowerCase()
    return (
      (d.reason && d.reason.toLowerCase().includes(s)) ||
      (d.id && d.id.toLowerCase().includes(s))
    )
  })

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Flame className="h-6 w-6 text-rose-600" />
            </div>
            Pemusnahan Stok
          </h1>
          <p className="text-muted-foreground mt-1">Catat dan pantau barang yang dimusnahkan karena rusak atau kedaluwarsa.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/inventory/disposals/create">
            <Button className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-sm w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Catat Pemusnahan
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <Button variant="outline" className="gap-2 text-foreground border-border bg-card">
              <Filter className="h-4 w-4 text-muted-foreground" /> Filter
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari alasan atau no pemusnahan..." 
                className="pl-9 bg-background border-border h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat data pemusnahan stok dari database...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent bg-muted/10">
                    <TableHead className="font-semibold text-foreground pl-6">ID Pemusnahan</TableHead>
                    <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                    <TableHead className="font-semibold text-foreground">Alasan</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                        <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-base font-medium">Belum ada riwayat pemusnahan stok.</p>
                        <p className="text-xs text-muted-foreground mt-1">Data pemusnahan yang dicatat akan tersinkron di sini.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDisposals.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 border-border transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-foreground pl-6">{item.id.slice(0, 12)}...</TableCell>
                        <TableCell className="text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}</TableCell>
                        <TableCell className="text-foreground">{item.reason || '-'}</TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
