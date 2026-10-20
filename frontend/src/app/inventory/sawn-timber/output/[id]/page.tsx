"use client"
import { useState, useEffect, use } from "react"
import { TimberAPI, MasterDataAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Loader2, ArrowLeft, Box, Waypoints, CheckCircle2, Factory, Calendar, FileCheck, XCircle, Package, Printer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function SawnTimberOutputDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [grades, setGrades] = useState<any[]>([])

  const loadData = () => {
    TimberAPI.getSawnOutput(id).then(setData).catch(console.error).finally(() => setLoading(false))
      MasterDataAPI.getGrades().then(setGrades).catch(console.error)
  }
  useEffect(() => { loadData() }, [id])

  const handleAction = async (action: "post" | "cancel") => {
    setActionLoading(true)
    try {
      if (action === "post") await TimberAPI.postSawnOutput(id)
      else await TimberAPI.cancelSawnOutput(id)
      toast({ title: "Success", description: `Output ${action === "post" ? "posted" : "cancelled"} successfully.` })
      loadData()
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || `Failed to ${action}.`, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

    const handleUpdateGrade = async (itemId: string, gradeId: string, gradeCode: string) => {
    try {
      await TimberAPI.updateSawnItemGrade(id, itemId, { gradeId, grade: gradeCode });
      toast({ title: "Success", description: "Grade updated successfully." });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Failed to update grade.", variant: "destructive" });
    }
  }

  const getStatusBadge = (s: string) => {
    const status = (s || "").toUpperCase();
    if (status === 'COMPLETED' || status === 'POSTED') return <span className="inline-flex items-center rounded-sm bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success-foreground uppercase tracking-wider">{status}</span>;
    if (status === 'DRAFT') return <span className="inline-flex items-center rounded-sm bg-secondary/80 text-secondary-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">DRAFT</span>;
    if (status === 'CANCELLED') return <span className="inline-flex items-center rounded-sm bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive uppercase tracking-wider">CANCELLED</span>;
    return <span className="inline-flex items-center rounded-sm bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wider">{status}</span>;
  }

  if (loading) return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  if (!data) return <div className="p-8 md:p-24 flex flex-col items-center justify-center text-center animate-in fade-in"><Box className="w-12 h-12 text-muted-foreground opacity-30 mb-4" /><h2 className="text-xl font-bold text-foreground mb-2">Output not found</h2><p className="text-muted-foreground max-w-md mb-6 text-[15px]">Output yang diminta tidak ditemukan atau sudah tidak tersedia.</p><Button onClick={() => data?.partaiId ? router.push(`/inventory/partai/${data.partaiId}?tab=output`) : router.push('/inventory/sawn-timber/output')} variant="outline" className="h-10 px-6 font-semibold"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Sawn Timber Output</Button></div>

  const totalPcs = data.items?.reduce((s:number, i:any)=>s+(i.quantityPcs||0), 0) || 0;
  const totalM3 = data.items?.reduce((s:number, i:any)=>s+(i.volumeM3||0), 0) || 0;

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => data?.partaiId ? router.push(`/inventory/partai/${data.partaiId}?tab=output`) : router.push('/inventory/sawn-timber/output')} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Sawn Timber Output {data.bundleNumber}
              </h1>
              {getStatusBadge(data.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Factory className="w-4 h-4" /> Sawn Timber Bundle Output
            </p>
          </div>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2">
            <Button variant="outline" onClick={() => window.open(`/inventory/production/${id}/print`, "_blank")} className="w-full sm:w-auto shadow-sm font-semibold h-10">
              <Printer className="w-4 h-4 mr-2" /> Print Output
            </Button>
            {data.status === "DRAFT" && (
            <Button onClick={() => handleAction("post")} disabled={actionLoading} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-sm font-semibold h-10">
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />} Post to Stock
            </Button>
          )}
          {data.status === "POSTED" && (
            <Button onClick={() => handleAction("cancel")} disabled={actionLoading} variant="destructive" className="w-full sm:w-auto shadow-sm font-semibold h-10">
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />} Cancel & Reverse
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Operation Info */}
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> OUTPUT INFORMATION
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-2 gap-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Date</p>
                <p className="font-semibold text-foreground/90">{new Date(data.outputDate || Date.now()).toLocaleDateString("id-ID")}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Shift</p>
                <p className="font-semibold text-foreground/90">{data.shift || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
                <p className="font-semibold text-foreground/90">{data.location?.name || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Partai</p>
                <p className="font-semibold text-foreground/90">{data.batch || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Summary */}
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Box className="w-4 h-4" /> QUANTITY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-row items-center justify-between min-h-[120px]">
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tracking-tight text-foreground/90">{totalPcs}</span>
              <span className="text-[11px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">PCS</span>
            </div>
            <div className="h-12 w-px bg-border/80 mx-2"></div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tracking-tight text-primary">{totalM3.toFixed(4)}</span>
              <span className="text-[11px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">M³</span>
            </div>
          </CardContent>
        </Card>

        {/* Traceability */}
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Waypoints className="w-4 h-4 text-emerald-600" /> SOURCE / TRACEABILITY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-3 h-full justify-center">
              <div className="p-3 border border-border/60 rounded-lg bg-muted/30">
                <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide mb-1">
                  <Box className="w-3.5 h-3.5" /> Source Input Log
                </p>
                {data.inputLogId ? (
                  <Link href={`/inventory/input-logs/${data.inputLogId}`} className="text-sm font-bold text-primary hover:underline">
                    {data.inputLog?.inputNumber || data.inputLogId}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">-</span>
                )}
              </div>
              <div className="p-3 border border-primary/20 rounded-lg bg-primary/5">
                <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5 uppercase tracking-wide mb-1">
                  <Factory className="w-3.5 h-3.5" /> Generated Bundle
                </p>
                <p className="text-sm font-bold text-foreground/90">{data.bundleNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4" /> PRODUCT DETAILS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.items && data.items.length > 0 ? (
              <div className="overflow-x-auto w-full sm:max-w-none">
                <table className="min-w-[800px] md:min-w-full w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Product / Variant</th>
                      <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Grade</th>
                      <th className="p-4 px-6 text-center font-semibold text-muted-foreground h-11">Dimensions</th>
                      <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Qty (PCS)</th>
                      <th className="p-4 px-6 text-right font-semibold text-muted-foreground h-11">Volume (M³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-semibold text-foreground/90">{item.timberVariant?.sku || "-"}</div>
                          <div className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{item.timberVariant?.species || "-"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          {data.status === 'DRAFT' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger className={`inline-flex items-center justify-center rounded-sm px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${item.grade === 'PENDING' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                                {item.grade === 'PENDING' ? 'BELUM DIISI' : (grades.find(g => g.code === item.grade)?.name || item.grade)}
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center">
                                {grades.map(g => (
                                  <DropdownMenuItem key={g.id} onClick={() => handleUpdateGrade(item.id, g.id, g.code || g.name || 'STANDARD')}>
                                    {g.name || g.code || 'Unknown Grade'}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className={`inline-flex items-center rounded-sm px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${item.grade === 'PENDING' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                              {item.grade === 'PENDING' ? 'BELUM DIISI' : (grades.find(g => g.code === item.grade)?.name || item.grade)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-center font-medium text-muted-foreground">
                          {item.thicknessMm || 0} &times; {item.widthMm || 0} &times; {item.lengthMm || 0} mm
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-foreground/90">{item.quantityPcs || 0}</td>
                        <td className="py-3 px-6 text-right font-bold text-primary">{(item.volumeM3 || 0).toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No product details found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



