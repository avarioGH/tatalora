"use client"
import { useState, useEffect } from"react"
import { TimberAPI } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { Badge } from"@/components/ui/badge"
import { Loader2, History, ArrowLeft } from"lucide-react"
import { useRouter } from"next/navigation"
import { Button } from"@/components/ui/button"

export default function ImportHistoryPage() {
 const router = useRouter()
 const [data, setData] = useState<any[]>([])
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 TimberAPI.getImportHistory().then((res: any) => setData(res.items || [])).catch(console.error).finally(() => setLoading(false))
 }, [])

 return (
 <div className="space-y-6 pb-10">
 <div className="flex items-center gap-4">
 <Button variant="outline" size="icon" onClick={() => router.push("/inventory/import")}><ArrowLeft className="w-4 h-4"/></Button>
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Import History</h1>
 <p className="text-muted-foreground mt-1">Log of past Excel imports.</p>
 </div>
 </div>

 <Card className="shadow-sm">
 <CardHeader className="pb-4 border-b border-border/40"><CardTitle className="text-[16px] font-semibold flex items-center gap-2"><History className="w-5 h-5"/> Import Sessions</CardTitle></CardHeader>
 <CardContent className="p-0">
 {loading ? <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div> : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Date</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">File Name</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Import Type</th>
 <th className="p-4 px-6 text-right text-[#526174] font-semibold text-[13px] tracking-wide">Rows</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">User</th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? <tr><td colSpan={6} className="text-center p-4 md:p-8 text-muted-foreground">No history</td></tr> :
 data.map(t => (
 <tr key={t.id} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
 <td className="py-3.5 px-6 text-[13px]">{new Date(t.createdAt).toLocaleString("id-ID")}</td>
 <td className="py-3.5 px-6 font-semibold text-primary text-[13px]">{t.fileName}</td>
 <td className="py-3.5 px-6 text-[13px]">{t.importType}</td>
 <td className="p-4 px-6 text-right font-bold">{t.importedRows} / {t.totalRows}</td>
 <td className="py-3.5 px-6 text-center text-[13px]"><Badge variant={t.status ==="COMPLETED" ?"default" : (t.status ==="FAILED" ?"destructive" :"secondary")}>{t.status}</Badge></td>
 <td className="p-4 px-6 text-muted-foreground">{t.createdBy}</td>
 </tr>
 ))
 }
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}
