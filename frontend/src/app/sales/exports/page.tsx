"use client"
import { useState, useEffect } from "react"
import { exportShipment } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Eye, Printer, Trash } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function ExportShipmentsPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = () => {
    exportShipment.getAll().then(res => {
      setData(res?.data || res || [])
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this export?")) return
    try {
      await exportShipment.delete(id)
      toast({ title: "Deleted" })
      loadData()
    } catch(e) {
      toast({ title: "Error deleting", variant: "destructive" })
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Daftar Barang Eksport</h1>
        <Link href="/sales/exports/create">
          <Button><Plus className="w-4 h-4 mr-2" /> Buat Dokumen Baru</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No Container</TableHead>
                <TableHead>Seal No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
              ) : (!data || data.length === 0) ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">Belum ada dokumen eksport</TableCell></TableRow>
              ) : (
                (data || []).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.containerNo}</TableCell>
                    <TableCell>{item.sealNo}</TableCell>
                    <TableCell>{new Date(item.exportDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/sales/exports/${item.id}/print`}>
                        <Button variant="outline" size="sm" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500">
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
