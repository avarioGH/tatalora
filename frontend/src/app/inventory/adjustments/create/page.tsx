"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { InventoryAPI, MasterDataAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function CreateAdjustmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [variants, setVariants] = useState<any[]>([])

  const [form, setForm] = useState({
    adjustmentDate: new Date().toISOString().split("T")[0],
    locationId: "",
    reason: "",
    notes: "",
  })

  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    InventoryAPI.getWarehouses().then((res: any) => setWarehouses(Array.isArray(res) ? res : res.data || []))
    MasterDataAPI.getTimberVariants().then((res: any) => setVariants(Array.isArray(res) ? res : res.data || []))
  }, [])

  const addItem = () => {
    setItems([...items, { timberVariantId: "", type: "IN", quantityPcs: 1, volumeM3: 0, notes: "", bundleNumber: "" }])
  }

  const removeItem = (index: number) => {
    setItems((Array.isArray(items) ? items : []).filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.locationId) return toast({ title: "Error", description: "Please select a warehouse.", variant: "destructive" })
    if (items.length === 0) return toast({ title: "Error", description: "Please add at least one item.", variant: "destructive" })

    setLoading(true)
    try {
      await InventoryAPI.createAdjustment({
        ...form,
        items: items.map(it => ({
          ...it,
          quantityPcs: Number(it.quantityPcs),
          volumeM3: Number(it.volumeM3)
        }))
      })
      toast({ title: "Success", description: "Stock adjustment created as DRAFT." })
      router.push("/inventory/adjustments")
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to create adjustment.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-10 p-4 md:p-8 dark">
      <div className="flex items-center gap-4">
        <Link href="/inventory/adjustments">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Stock Adjustment</h1>
          <p className="text-sm text-muted-foreground">Create a new manual stock correction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-[#0f172a] text-white border-border">
          <CardHeader>
            <CardTitle className="text-lg">Adjustment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" className="bg-background text-foreground" value={form.adjustmentDate} onChange={(e) => setForm({...form, adjustmentDate: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" value={form.locationId} onChange={(e) => setForm({...form, locationId: e.target.value})} required>
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Reason</Label>
              <Input placeholder="e.g. Broken stock, Inventory recount..." className="bg-background text-foreground" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes (Optional)</Label>
              <Input placeholder="Additional context..." className="bg-background text-foreground" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f172a] text-white border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Adjusted Items</CardTitle>
            <Button type="button" onClick={addItem} size="sm" className="gap-2"><Plus className="w-4 h-4"/> Add Item</Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded text-muted-foreground">No items added yet. Click "Add Item" to begin.</div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-border/50 rounded-lg relative items-end bg-background/50">
                    <div className="md:col-span-3 space-y-1">
                      <Label className="text-xs">Variant</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" value={item.timberVariantId} onChange={(e) => updateItem(index, 'timberVariantId', e.target.value)} required>
                        <option value="">Select Variant...</option>
                        {variants.map(v => <option key={v.id} value={v.id}>{v.sku}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" value={item.type} onChange={(e) => updateItem(index, 'type', e.target.value)} required>
                        <option value="IN">IN (+ Stock)</option>
                        <option value="OUT">OUT (- Stock)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Qty Pcs</Label>
                      <Input type="number" min="1" className="bg-background text-foreground" value={item.quantityPcs} onChange={(e) => updateItem(index, 'quantityPcs', e.target.value)} required />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Volume M3</Label>
                      <Input type="number" step="0.0001" className="bg-background text-foreground" value={item.volumeM3} onChange={(e) => updateItem(index, 'volumeM3', e.target.value)} required />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Bundle (Opt)</Label>
                      <Input placeholder="e.g. B-001" className="bg-background text-foreground" value={item.bundleNumber} onChange={(e) => updateItem(index, 'bundleNumber', e.target.value)} />
                    </div>
                    <div className="md:col-span-1 text-right">
                      <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-500/10" onClick={() => removeItem(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/inventory/adjustments">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </form>
    </div>
  )
}
