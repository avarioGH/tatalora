"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { OpnameAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, RefreshCw, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function StockOpnamePage() {
  const { toast } = useToast()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [mismatches, setMismatches] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { 
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await OpnameAPI.list()
      setData(Array.isArray(res) ? res : [])
    } catch (err) { 
      console.error(err)
      toast({ title: "Error", description: "Failed to load opname list", variant: "destructive" })
    } finally { 
      setLoading(false) 
    }
  }

  const runReconciliation = async () => {
    setReconciling(true)
    try {
      const res = await OpnameAPI.reconcile()
      if (res.mismatches && res.mismatches.length > 0) {
        setMismatches(res.mismatches)
        setShowModal(true)
        toast({ title: "Reconciliation Finished", description: "Found mismatches.", variant: "destructive" })
      } else {
        toast({ title: "Reconciliation Finished", description: "No mismatches found. Data is synced." })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Reconciliation failed.", variant: "destructive" })
    } finally {
      setReconciling(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Stock Opname</h1>
          <p className="text-muted-foreground mt-1">Physical stock counting and reconciliation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runReconciliation} disabled={reconciling}>
            {reconciling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Run Reconciliation
          </Button>
          <Button onClick={() => router.push('/inventory/stock-opname/create')} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Create New
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <CardTitle className="text-[16px] font-semibold">Opname History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[600px] md:min-w-full w-full text-sm">
                <thead className="bg-muted border-y border-border"><tr>
                  <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Opname No</th>
                  <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Warehouse</th>
                  <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Date</th>
                  <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
                  <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Action</th>
                </tr></thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan={5} className="text-center p-12 text-muted-foreground">No opname sessions found.</td></tr>
                  ) : data.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 px-6 font-medium text-purple-600">{t.opnameNumber || t.id.slice(0,8)}</td>
                      <td className="p-4 px-6 font-medium">{t.warehouse?.name || '-'}</td>
                      <td className="p-4 px-6 text-muted-foreground">{new Date(t.date || t.createdAt || Date.now()).toLocaleDateString('id-ID')}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">
                        <Badge variant={t.status === 'CONFIRMED' ? 'default' : 'secondary'}>{t.status || 'DRAFT'}</Badge>
                      </td>
                      <td className="py-3.5 px-6 text-center text-[13px]">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/inventory/stock-opname/${t.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reconciliation Mismatches</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 text-right">System Qty</th>
                  <th className="p-2 text-right">Physical Qty</th>
                  <th className="p-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {mismatches.map((m, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{m.productName || m.productId}</td>
                    <td className="p-2 text-right">{m.systemQty}</td>
                    <td className="p-2 text-right">{m.physicalQty}</td>
                    <td className="p-2 text-right text-destructive font-medium">{m.variance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
