"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { InventoryAPI, OpnameAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function CreateOpnamePage() {
  const { toast } = useToast()
  const router = useRouter()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    InventoryAPI.getWarehouses()
      .then((res: any) => setWarehouses(Array.isArray(res) ? res : []))
      .catch((err: any) => console.error(err))
  }, [])

  const startOpname = async () => {
    if (!selectedWarehouse) {
      toast({ title: "Required", description: "Please select a warehouse.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await OpnameAPI.createDraft(selectedWarehouse)
      toast({ title: "Opname Draft Created", description: "Navigating to count sheet..." })
      router.push(`/inventory/stock-opname/${res.id}`)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create opname.", variant: "destructive" })
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-10">
      <Link href="/inventory/stock-opname" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Opname List
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Start New Stock Opname</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Warehouse</label>
            <Select value={selectedWarehouse} onValueChange={(val) => setSelectedWarehouse(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a warehouse to count..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startOpname} disabled={loading || !selectedWarehouse} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Generate Count Sheet
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
