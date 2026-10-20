"use client"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, SlidersHorizontal, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function AdjustmentsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/inventory/transactions')
      .then((res: any) => {
        const items = Array.isArray(res.data) ? res.data : [];
        setData((Array.isArray(items) ? items : []).filter((i: any) => i.transaction_type === 'ADJUSTMENT'));
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Penyesuaian Stok</h1>
          <p className="text-muted-foreground mt-1">Lakukan koreksi stok sistem (Stock Opname) terhadap stok fisik gudang.</p>
        </div>
        <Link href="/inventory/adjustments/create">
          <Button className="shadow-sm">Buat Penyesuaian</Button>
        </Link>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" /> Riwayat Penyesuaian</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="p-4 px-6 text-left font-semibold text-muted-foreground">No. Ref</th>
                  <th className="p-4 px-6 text-left font-semibold text-muted-foreground">Tanggal</th>
                  <th className="p-4 px-6 text-left font-semibold text-muted-foreground">Gudang</th>
                  <th className="p-4 px-6 text-left font-semibold text-muted-foreground">Keterangan</th>
                  <th className="p-4 px-6 text-center font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr><td colSpan={5} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Tidak ada riwayat penyesuaian stok.</td></tr>
                ) : (
                  data.map((item, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 px-6 font-bold text-foreground">{item.transaction_no}</td>
                      <td className="p-4 px-6 text-foreground">{new Date(item.transaction_date || item.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 px-6 font-medium">{item.warehouse?.name || '-'}</td>
                      <td className="p-4 px-6 text-muted-foreground">{item.notes || '-'}</td>
                      <td className="p-4 px-6 text-center">
                        <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'}>{item.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
