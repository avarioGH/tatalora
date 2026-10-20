"use client"
import { useState, useEffect } from"react"
import { api } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { Loader2 } from"lucide-react"
import { Input } from"@/components/ui/input"

export default function DailyMonitoringPage() {
 const [data, setData] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0])

 useEffect(() => {
 setLoading(true)
 const startDate = new Date(dateStr)
 startDate.setHours(0,0,0,0)
 const endDate = new Date(dateStr)
 endDate.setHours(23,59,59,999)

 api.get(`/inventory/reports/daily-monitoring?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
 .then(res => setData(res.data))
 .catch(console.error)
 .finally(() => setLoading(false))
 }, [dateStr])

 return (
 <div className="space-y-6 pb-10 p-4 md:p-8 dark">
 <div className="flex justify-between items-end">
 <div>
 <h2 className="text-2xl font-bold tracking-tight text-white">Daily Sawmill Monitoring</h2>
 <p className="text-muted-foreground text-muted-foreground">Track logs receiving, trimming, input, and sawn timber output metrics.</p>
 </div>
 <div>
 <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="bg-slate-800 border-border text-white" />
 </div>
 </div>

 {loading ? (
 <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
 ) : data ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="bg-slate-900 border-border">
 <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">LOG RECEIVING (Raw Logs)</CardTitle></CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{data.receiving.count} <span className="text-sm font-normal text-muted-foreground">BTG</span></div>
 <div className="text-sm text-primary mt-2">Gross: {data.receiving.grossM3.toFixed(2)} M³</div>
 <div className="text-sm text-primary">Net: {data.receiving.netM3.toFixed(2)} M³</div>
 </CardContent>
 </Card>

 <Card className="bg-slate-900 border-border">
 <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">TRIMMING YIELD</CardTitle></CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{data.trimming.count} <span className="text-sm font-normal text-muted-foreground">PCS</span></div>
 <div className="text-sm text-primary mt-2">Volume: {data.trimming.m3.toFixed(2)} M³</div>
 </CardContent>
 </Card>

 <Card className="bg-slate-900 border-border">
 <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">INPUT LOGS (Produksi)</CardTitle></CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{data.input.count} <span className="text-sm font-normal text-muted-foreground">Inputs</span></div>
 <div className="text-sm text-amber-400 mt-2">Volume: {data.input.m3.toFixed(2)} M³</div>
 <div className="text-sm text-muted-foreground">Avg Length: {data.input.avgLength.toFixed(2)} m</div>
 </CardContent>
 </Card>

 <Card className="bg-slate-900 border-border">
 <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">SAWN TIMBER OUTPUT</CardTitle></CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-white">{data.output.count} <span className="text-sm font-normal text-muted-foreground">Bundles</span></div>
 <div className="text-sm text-primary mt-2">Volume: {data.output.m3.toFixed(4)} M³</div>
 <div className="text-sm font-bold text-amber-500">Rendement: {data.output.rendement.toFixed(2)}%</div>
 </CardContent>
 </Card>
 </div>
 ) : (
 <div className="text-center p-12 text-muted-foreground">No data available for this date.</div>
 )}
 </div>
 )
}
