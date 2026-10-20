"use client"
import { useState, useEffect } from "react"
import { ProductionAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Hammer, Info, Package, LogOut, FileText } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ProductionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchProcess = () => {
    setLoading(true)
    ProductionAPI.getProcess(params.id as string)
      .then((res: any) => setData(res))
      .catch((err: any) => {
        toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Failed to load process", variant: "destructive" })
        router.push('/inventory/production')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (params.id) fetchProcess()
  }, [params.id])

  const handleConfirm = async () => {
    setConfirming(true)
    setErrorMsg(null)
    try {
      await ProductionAPI.confirmProcess(params.id as string)
      toast({ title: "Berhasil", description: "Production Process berhasil dikonfirmasi" })
      setShowConfirmModal(false)
      fetchProcess()
    } catch (err: any) {
      const msg = (err.response?.data?.error?.message || err.response?.data?.message) || "Gagal mengkonfirmasi process"
      const lowerMsg = msg.toLowerCase()
      if (lowerMsg.includes("consumed") || lowerMsg.includes("insufficient")) {
        setErrorMsg(msg)
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" })
      }
    } finally {
      setConfirming(false)
    }
  }

  const getStatusBadge = (s: string) => {
    const status = (s || "").toUpperCase();
    if (status === 'COMPLETED' || status === 'CONFIRMED') return <span className="inline-flex items-center rounded-sm bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success-foreground uppercase tracking-wider">{status}</span>;
    if (status === 'DRAFT') return <span className="inline-flex items-center rounded-sm bg-secondary/80 text-secondary-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">DRAFT</span>;
    if (status === 'CANCELLED') return <span className="inline-flex items-center rounded-sm bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive uppercase tracking-wider">CANCELLED</span>;
    return <span className="inline-flex items-center rounded-sm bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wider">{status}</span>;
  }

  const getTypeBadge = (type: string) => {
    return <span className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30">{type}</span>;
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  if (!data) return null

  const inputTotal = data.inputs?.reduce((acc: number, val: any) => acc + (val.quantity || 0), 0) || 0;
  const outputTotal = data.outputs?.reduce((acc: number, val: any) => acc + (val.quantity || 0), 0) || 0;

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/inventory/production')} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Production {data.processNumber || data.processNo}
              </h1>
              {getStatusBadge(data.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex gap-4">
              <span>{new Date(data.date || data.processDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {data.type || data.processType}</span>
            </p>
          </div>
        </div>
        
        {data.status === "DRAFT" && (
          <Button onClick={() => setShowConfirmModal(true)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-sm font-semibold h-10">
            <CheckCircle className="w-4 h-4 mr-2" /> Confirm Production
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Process Info</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-5 space-y-4">
            <div>
              <p className="text-[13px] text-muted-foreground mb-1">Process Type</p>
              <div className="font-semibold text-foreground/90">{getTypeBadge(data.type || data.processType)}</div>
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground mb-1">Operator / Created By</p>
              <p className="font-semibold text-foreground/90">{data.createdBy || data.operator || '-'}</p>
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/40">{data.notes || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600"><LogOut className="w-4 h-4" /> Total Input (Consumed)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[160px]">
            <span className="text-4xl font-black tracking-tight text-foreground/90">{inputTotal}</span>
            <span className="text-sm font-medium text-muted-foreground mt-2 uppercase tracking-wide">PCS / Items</span>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-600"><Package className="w-4 h-4" /> Total Output (Produced)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[160px]">
            <span className="text-4xl font-black tracking-tight text-foreground/90">{outputTotal}</span>
            <span className="text-sm font-medium text-muted-foreground mt-2 uppercase tracking-wide">PCS / Items</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold text-foreground">INPUT MATERIAL</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.inputs && data.inputs.length > 0 ? (
              <div className="overflow-x-auto w-full sm:max-w-none">
                <table className="min-w-[600px] md:min-w-full w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Timber Stock / Bundle</th>
                      <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Quantity Consumed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inputs.map((inp: any) => (
                      <tr key={inp.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-6 font-semibold text-foreground/90">{inp.timberStock?.bundleNumber || inp.timberStockId}</td>
                        <td className="py-3 px-6 text-right font-bold text-rose-600">-{inp.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No inputs found.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold text-foreground">OUTPUT / RESULT</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.outputs && data.outputs.length > 0 ? (
              <div className="overflow-x-auto w-full sm:max-w-none">
                <table className="min-w-[700px] md:min-w-full w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Product Variant</th>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Output Type</th>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Remarks</th>
                      <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Quantity Produced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.outputs.map((out: any) => (
                      <tr key={out.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-6 font-semibold text-foreground/90">{out.variant?.name || out.variantId}</td>
                        <td className="py-3 px-6">
                          {out.type === "PRODUCT" ? (
                            <span className="inline-flex items-center rounded-sm bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">{out.type}</span>
                          ) : (
                            <span className="inline-flex items-center rounded-sm bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 uppercase tracking-wider">{out.type}</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-[13px] text-muted-foreground">{out.remarks || '-'}</td>
                        <td className="py-3 px-6 text-right font-bold text-emerald-600">+{out.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No outputs found.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirmModal} onOpenChange={(open) => {
        setShowConfirmModal(open)
        if (!open) setErrorMsg(null)
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground font-bold">Confirm Production</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Are you sure you want to confirm this production process? 
              <br/><br/>
              <span className="text-amber-600 font-medium">Warning:</span> This will mutate inventory stocks. 
              Inputs will be deducted from TimberStock, and Outputs will be added as new items. This action cannot be undone easily.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <Alert variant="destructive" className="mt-2 bg-destructive/5 border-destructive/20 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold">Validation Error</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap text-[13px] leading-relaxed opacity-90">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-6 flex-col sm:flex-row gap-3 sm:gap-2">
            <Button variant="outline" className="w-full sm:w-auto h-10 font-semibold" onClick={() => {
              setShowConfirmModal(false)
              setErrorMsg(null)
            }}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={confirming} className="w-full sm:w-auto h-10 bg-emerald-600 hover:bg-emerald-700 font-semibold">
              {confirming ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
              Confirm & Mutate Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
