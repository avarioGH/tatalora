"use client"
import { useState, useEffect } from "react"
import { TimberAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Ruler, Box, Waypoints, CheckCircle2, Factory, Printer } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

export default function TrimmedLogDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || id === 'undefined' || id.length !== 24) {
      setError('ID kayu tidak valid')
      setLoading(false)
      return
    }
    TimberAPI.getTrimmedLog(id)
      .then(setData)
      .catch((e: any) => setError(e?.response?.data?.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }, [id])


  if (loading) return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
  if (error || !data) return (
    <div className="p-8 md:p-24 text-center space-y-4">
      <p className="text-red-500 font-semibold">{error || 'Trimmed log not found.'}</p>
      <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Go Back</Button>
    </div>
  )


 return (
 <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
 <div className="flex items-center gap-4">
 <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.trimNumber}</h1>
 <Badge variant={data.status ==="AVAILABLE" ?"default" :"secondary"} className={data.status ==="AVAILABLE" ?"bg-emerald-500" :""}>{data.status}</Badge>
 </div>
 <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2"><Factory className="w-4 h-4" /> Trimmed Timber Log &bull; {data.species}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline">Print Barcode</Button>
            <Button variant="default" onClick={() => window.open(`/inventory/trimming/${id}/print`, "_blank")}><Printer className="w-4 h-4 mr-2" /> Print Document</Button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10"><CardTitle className="text-[16px] font-semibold flex items-center gap-2"><Ruler className="w-4 h-4" /> Measurements</CardTitle></CardHeader>
 <CardContent className="pt-6 space-y-4 text-sm">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
 <div><p className="text-muted-foreground">Length</p><p className="font-bold">{data.length} m</p></div>
 <div><p className="text-muted-foreground">Parent Class</p><p className="font-bold">{data.rawLog?.diameterClass}</p></div>
 <div><p className="text-muted-foreground">Avg &Oslash;</p><p className="font-bold">{data.averageDiameter} cm</p></div>
 <div><p className="text-muted-foreground">Rounded &Oslash;</p><p className="font-bold text-lg text-primary">{data.roundedDiameter} cm</p></div>
 </div>
 <hr />
 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-xs">
 <div className="bg-muted/50 p-2 rounded"><span className="block text-muted-foreground">D1</span><span className="font-medium">{data.diameter1}</span></div>
 <div className="bg-muted/50 p-2 rounded"><span className="block text-muted-foreground">D2</span><span className="font-medium">{data.diameter2}</span></div>
 <div className="bg-muted/50 p-2 rounded"><span className="block text-muted-foreground">D3</span><span className="font-medium">{data.diameter3}</span></div>
 <div className="bg-muted/50 p-2 rounded"><span className="block text-muted-foreground">D4</span><span className="font-medium">{data.diameter4}</span></div>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10"><CardTitle className="text-lg flex items-center gap-2 text-foreground"><Box className="w-4 h-4" /> Volume Calculation</CardTitle></CardHeader>
 <CardContent className="pt-6 space-y-4 text-sm">
 <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-medium">Gross Volume</span><span className="font-medium">{data.grossVolume} m&sup3;</span></div>
 <div className="flex justify-between items-center"><span className="text-red-500 dark:text-red-400 font-medium">Gerowong Volume</span><span>- {data.hollowVolume || 0} m&sup3;</span></div>
 <div className="flex justify-between items-center"><span className="text-amber-600 dark:text-amber-400 font-medium">Trimming Volume</span><span>- {data.trimmingVolume || 0} m&sup3;</span></div>
 <hr className="border-border/50" />
 <div className="flex justify-between items-center"><span className="font-bold text-foreground font-bold">Net Volume</span><span className="font-bold text-2xl text-primary">{data.netVolume} m&sup3;</span></div>
 </CardContent>
 </Card>

 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10"><CardTitle className="text-[16px] font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Identity & Location</CardTitle></CardHeader>
 <CardContent className="pt-6 space-y-4 text-sm">
 <div><p className="text-muted-foreground mb-1">Barcode / System ID</p><p className="font-mono bg-muted p-1.5 rounded text-xs">{data.barcode}</p></div>
 <div><p className="text-muted-foreground mb-1">Parent Raw Log</p><Link href={`/inventory/logs/${data.rawLogId}`} className="font-bold text-primary hover:underline">{data.rawLog?.logNumber}</Link></div>
 <div><p className="text-muted-foreground mb-1">Location</p><p className="font-medium text-primary/90">{data.location?.name ||"-"}</p></div>
 <div><p className="text-muted-foreground mb-1">Created At</p><p className="font-medium">{new Date(data.createdAt).toLocaleDateString("id-ID")}</p></div>
 </CardContent>
 </Card>
 </div>

 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="border-b pb-4"><CardTitle className="text-[16px] font-semibold flex items-center gap-2"><Waypoints className="w-4 h-4" /> Traceability</CardTitle></CardHeader>
 <CardContent className="pt-6">
 <div className="flex items-center gap-4 text-sm">
 <Link href={`/inventory/logs/${data.rawLogId}`} className="p-4 border rounded hover:border-emerald-500 transition-colors cursor-pointer block">
 <p className="font-medium text-muted-foreground flex items-center gap-2"><Box className="w-4 h-4" /> PARENT RAW LOG</p>
 <p className="text-xs">{data.rawLog?.logNumber}</p>
 </Link>
 <div className="h-px bg-border flex-1 mx-2"></div>
 <div className="p-4 border rounded bg-emerald-50 border-emerald-200">
 <p className="font-bold text-emerald-800 flex items-center gap-2"><Factory className="w-4 h-4" /> TRIMMED LOG</p>
 <p className="text-xs text-muted-foreground">{data.trimNumber}</p>
 </div>
 <div className="h-px bg-border flex-1 mx-2"></div>
 <div className="p-4 border rounded text-muted-foreground border-dashed">
 <p className="font-medium flex items-center gap-2"><Box className="w-4 h-4" /> INPUT LOG</p>
 <p className="text-xs">{data.inputLogId ? <Link href={`/inventory/input-logs/${data.inputLogId}`} className="font-bold text-primary hover:underline">{data.inputLog?.inputNumber}</Link> :"Pending"}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 )
}


