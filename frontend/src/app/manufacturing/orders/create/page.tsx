"use client"
import { useState, useEffect } from "react"
import { api, InventoryAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"

export default function CreateMOPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [boms, setBoms] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])

  const [form, setForm] = useState({
    bomId: "",
    warehouseId: "",
    plannedQty: 1
  })

  useEffect(() => {
    Promise.all([
      api.get('/manufacturing/bom').catch(() => ({ data: [] })),
      InventoryAPI.getWarehouses().catch(() => [])
    ]).then(([bomRes, whRes]) => {
      setBoms(bomRes?.data?.data || bomRes?.data || [])
      setWarehouses(whRes?.data || whRes || [])
    })
  }, [])

  const selectedBom = boms.find(b => b.id === form.bomId)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.bomId) return toast({ title: "Pilih BOM", variant: "destructive" })
    if (!form.warehouseId) return toast({ title: "Pilih Gudang", variant: "destructive" })
    if (form.plannedQty <= 0) return toast({ title: "Quantity tidak valid", variant: "destructive" })
    
    setLoading(true)
    try {
      const payload = {
        order_number: `MO-${Date.now()}`,
        product_id: selectedBom.product_id,
        bom_id: selectedBom.id,
        warehouse_id: form.warehouseId,
        planned_quantity: form.plannedQty,
        unit_id: selectedBom.unit_id,
        status: "DRAFT",
        items: (selectedBom.items || []).map((item: any) => ({
          product_id: item.product_id,
          required_quantity: (item.quantity / selectedBom.quantity) * form.plannedQty,
          unit_id: item.unit_id
        }))
      }
      await api.post('/manufacturing/mo', payload)
      toast({ title: "Manufacturing Order Berhasil dibuat" })
      router.push("/manufacturing/orders")
    } catch(err) {
      toast({ title: "Gagal membuat MO", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/manufacturing/orders")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Manufacturing Order</h1>
          <p className="text-muted-foreground text-sm">Rencana Produksi Baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Detail Produksi</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bill of Materials (BOM)</Label>
              <Select value={form.bomId} onValueChange={(v: any) => setForm({...form, bomId: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih BOM (Resep)" /></SelectTrigger>
                <SelectContent>
                  {boms.map(b => <SelectItem key={b.id} value={b.id}>{b.name} - {b.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedBom && (
              <div className="p-3 bg-accent rounded-md text-sm mb-4">
                Memproduksi produk dengan base quantity: <strong>{selectedBom.quantity}</strong>
              </div>
            )}

            <div className="space-y-2">
              <Label>Gudang (Target / Source)</Label>
              <Select value={form.warehouseId} onValueChange={(v: any) => setForm({...form, warehouseId: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih Gudang" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Planned Quantity</Label>
              <Input type="number" min="1" step="0.01" value={form.plannedQty} onChange={e => setForm({...form, plannedQty: Number(e.target.value)})} required />
            </div>

          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Menyimpan..." : "Buat MO (Draft)"}
        </Button>
      </form>
    </div>
  )
}

