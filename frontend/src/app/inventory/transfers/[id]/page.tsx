"use client"
import { use } from "react"
import { useState, useEffect } from "react"
import { TimberAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, ArrowRightLeft, FileCheck, XCircle, MapPin, Package2, AlertCircle, ArrowDown, Printer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")

  const loadData = () => {
    setLoading(true)
    TimberAPI.getTransfer(id).then(setData).catch((err: any) => {
      setError("Failed to load transfer data")
      console.error(err)
    }).finally(() => setLoading(false))
  }
  
  useEffect(() => { loadData() }, [id])

  const handleAction = async (action: "post" | "cancel") => {
    if (!confirm(`Are you sure you want to ${action} this transfer?`)) return
    setActionLoading(true)
    try {
      if (action === "post") await TimberAPI.postTransfer(id)
      else await TimberAPI.cancelTransfer(id)
      toast({ title: "Success", description: `Transfer ${action === "post" ? "posted" : "cancelled"} successfully.` })
      loadData()
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || `Failed to ${action}.`, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  }

  if (!data && error) {
    return (
      <div className="p-8 md:p-24 flex flex-col items-center justify-center text-center animate-in fade-in">
        <ArrowRightLeft className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Transfer Not Found</h2>
        <p className="text-muted-foreground max-w-md mb-6 text-[15px]">Data stock transfer tidak ditemukan atau terjadi kesalahan koneksi server.</p>
        <Button onClick={() => router.push('/inventory/transfers')} variant="outline" className="h-10 px-6 font-semibold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Transfers
        </Button>
      </div>
    )
  }

  if (!data) return null;

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-12 px-4 md:px-6 box-border">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/inventory/transfers')} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {data.transferNumber || "Transfer Detail"}
              </h1>
              <Badge 
                variant={data.status === 'POSTED' ? 'default' : data.status === 'CANCELLED' ? 'destructive' : 'secondary'} 
                className={`text-[11px] font-bold tracking-wider uppercase ${data.status === 'POSTED' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                {data.status || 'DRAFT'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> 
              Internal Stock Transfer
            </p>
          </div>
        </div>
        
        <div className="flex w-full sm:w-auto gap-2">
            <Button variant="outline" onClick={() => window.open(`/inventory/transfers/${id}/print`, "_blank")} className="w-full sm:w-auto shadow-sm font-semibold h-10">
              <Printer className="w-4 h-4 mr-2" /> Print Transfer
            </Button>
            {data.status === "DRAFT" && (
            <Button onClick={() => handleAction("post")} disabled={actionLoading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 font-semibold h-10">
              <FileCheck className="w-4 h-4 mr-2" /> Post Transfer
            </Button>
          )}
          {data.status === "POSTED" && (
            <Button onClick={() => handleAction("cancel")} disabled={actionLoading} variant="destructive" className="w-full sm:w-auto font-semibold h-10">
              <XCircle className="w-4 h-4 mr-2" /> Cancel & Reverse
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Transfer Route */}
        <Card className="bg-card rounded-xl border border-border shadow-sm md:col-span-1">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Transfer Route
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col gap-0">
            
            <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <div className="shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">From Location</p>
                <p className="font-bold text-foreground/90 text-lg">{data.fromLocation?.name || "-"}</p>
              </div>
            </div>
            
            <div className="flex justify-start px-8 py-2 relative">
              <div className="h-6 w-0.5 bg-border absolute left-[41px] top-0"></div>
              <ArrowDown className="w-4 h-4 text-muted-foreground absolute left-[34px] top-6" />
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 mt-4">
              <div className="shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">To Location</p>
                <p className="font-bold text-indigo-900 dark:text-indigo-200 text-lg">{data.toLocation?.name || "-"}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/60 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Transfer Date</p>
                <p className="font-semibold text-foreground/90">{data.transferDate ? new Date(data.transferDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                <p className="font-medium text-muted-foreground">{data.notes || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="bg-card rounded-xl border border-border shadow-sm md:col-span-2">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package2 className="w-4 h-4 text-primary" /> Items Transferred
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full sm:max-w-none">
              <table className="min-w-[600px] md:min-w-full w-full text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Timber Product</th>
                    <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Grade</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Qty (PCS)</th>
                    <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Volume (M³)</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((item: any, i: number) => (
                    <tr key={item.id || i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-6">
                        <div className="font-semibold text-foreground/90">{item.timberVariant?.sku || "-"}</div>
                        <div className="text-[12px] text-muted-foreground mt-0.5">{item.timberVariant?.species || "-"}</div>
                      </td>
                      <td className="py-3 px-6 text-center font-medium text-muted-foreground">
                        {item.timberVariant?.grade || "-"}
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-foreground">
                        {item.quantityPcs}
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-primary">
                        {item.volumeM3 ? item.volumeM3.toFixed(6) : "0.000000"}
                      </td>
                    </tr>
                  ))}
                  {(!data.items || data.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
                        No items found for this transfer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

