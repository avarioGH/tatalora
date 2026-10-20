"use client"
import { useState, useEffect } from"react"
import { use } from "react"
import { TimberAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Ruler, Box, Waypoints, CheckCircle2, Factory, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RawLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [data, setData] = useState<any>(null)
  const [trimming, setTrimming] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      TimberAPI.getRawLog(id),
      TimberAPI.getRawLogTrimming(id).catch(() => null)
    ]).then(([logData, trimData]) => {
      setData(logData)
      setTrimming(trimData)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

 if (loading) return <div className="flex justify-center p-8 md:p-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
 if (!data) return <div className="p-8 md:p-24 text-center">Log not found.</div>

 return (
 <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
 <div className="flex items-center gap-4">
 <Button variant="outline" size="icon" onClick={() => data?.partaiId ? router.push(`/inventory/partai/${data.partaiId}`) : router.push('/inventory/logs')}><ArrowLeft className="w-4 h-4" /></Button>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.logNumber}</h1>
 <Badge variant={data.status ==="AVAILABLE" ?"default" :"secondary"} className={data.status ==="AVAILABLE" ?"bg-emerald-500" :""}>{data.status}</Badge>
 </div>
 <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2"><Box className="w-4 h-4" /> Raw Timber Log &bull; {data.species}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {data.status ==="AVAILABLE" && <Button variant="outline">Edit</Button>}
 <Button variant="outline">Print Barcode</Button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10"><CardTitle className="text-[16px] font-semibold flex items-center gap-2"><Ruler className="w-4 h-4" /> Measurements</CardTitle></CardHeader>
 <CardContent className="pt-6 space-y-4 text-sm">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
 <div><p className="text-muted-foreground">Original Length</p><p className="font-bold">{data.originalLength} m</p></div>
 <div><p className="text-muted-foreground">Class</p><p className="font-bold">{data.diameterClass}</p></div>
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
 <hr className="border-border" />
 <div className="flex justify-between items-center"><span className="font-bold text-foreground">Net Volume</span><span className="font-bold text-2xl text-primary">{data.netVolume} m&sup3;</span></div>
 </CardContent>
 </Card>

 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10"><CardTitle className="text-[16px] font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Identity & Location</CardTitle></CardHeader>
 <CardContent className="pt-6 space-y-4 text-sm">
 <div><p className="text-muted-foreground mb-1">Barcode / System ID</p><p className="font-mono bg-muted p-1.5 rounded text-xs">{data.barcode}</p></div>
 <div><p className="text-muted-foreground mb-1">Partai</p><p className="font-medium">{data.partai?.partaiNumber || "-"}</p></div>
 <div><p className="text-muted-foreground mb-1">Location</p><p className="font-medium text-primary/90">{data.location?.name ||"-"}</p></div>
 <div><p className="text-muted-foreground mb-1">Receiving Date</p><p className="font-medium">{new Date(data.receivingDate).toLocaleDateString("id-ID")}</p></div>
 </CardContent>
 </Card>
 </div>

 <Card className="bg-card rounded-xl border border-border shadow-sm">
 <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <CardTitle className="text-[16px] font-semibold flex items-center gap-2"><Factory className="w-4 h-4" /> Trimming Children</CardTitle>
   <Button size="sm" onClick={() => router.push(`/inventory/logs/${id}/trimming/create`)}><Plus className="w-4 h-4 mr-2"/> Add Trimming</Button>
 </CardHeader>
 <CardContent className="pt-6">
 {!trimming || trimming.children.length === 0 ? (
 <div className="text-center p-4 md:p-8 text-muted-foreground bg-muted/20 rounded-lg">No trimming records yet.</div>
 ) : (
 <div className="space-y-6">
 <div className="flex gap-8 text-sm">
 <div><p className="text-muted-foreground">Original Length</p><p className="font-bold text-lg">{data.originalLength} m</p></div>
 <div><p className="text-muted-foreground">Allocated</p><p className="font-bold text-lg text-primary">{trimming.allocated} m</p></div>
 <div><p className="text-muted-foreground">Remaining</p><p className="font-bold text-lg text-amber-600">{trimming.remaining} m</p></div>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-3 text-left">Trim Code</th>
 <th className="p-3 text-right">Length</th>
 <th className="p-3 text-right">&Oslash; Avg</th>
 <th className="p-3 text-right">Gross m&sup3;</th>
 <th className="p-3 text-right">Net m&sup3;</th>
 <th className="p-3 text-center">Status</th>
 </tr>
 </thead>
 <tbody>
 {trimming.children.map((c: any) => (
 <tr key={c.id} className="border-b hover:bg-muted/60 cursor-pointer transition-colors" onClick={() => router.push(`/inventory/trimming/${c.id}`)}>
 <td className="p-3 font-medium text-primary">{c.trimNumber}</td>
 <td className="p-3 text-right">{c.length} m</td>
 <td className="p-3 text-right">{c.averageDiameter} cm</td>
 <td className="p-3 text-right">{c.grossVolume}</td>
 <td className="p-3 text-right font-bold text-primary">{c.netVolume}</td>
 <td className="p-3 text-center"><Badge variant="secondary">{c.status}</Badge></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}


