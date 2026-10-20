"use client"
import { useState } from"react"
import { api } from"@/lib/api"
import { Input } from"@/components/ui/input"
import { Button } from"@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Search, Loader2, ArrowDown, History } from"lucide-react"
import { Badge } from"@/components/ui/badge"

export default function TraceabilityPage() {
 const [search, setSearch] = useState("")
 const [loading, setLoading] = useState(false)
 const [result, setResult] = useState<any>(null)
 const [error, setError] = useState("")

 const handleSearch = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!search) return
 setLoading(true)
 setError("")
 setResult(null)
 
 try {
 const res = await api.get("/inventory/reports/traceability?search=" + encodeURIComponent(search))
 if (res.data) {
 setResult(res.data)
 } else {
 setError("No traceability timeline found for this identifier.")
 }
 } catch (err: any) {
 setError(err?.response?.data?.message ||"Failed to search traceability")
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="space-y-6 pb-10">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Log Traceability</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Search and trace production logs across bundles, inputs, trim codes, and raw log records.</p>
 </div>

 <Card>
 <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
 <CardTitle className="text-base font-semibold">Search Traceability</CardTitle>
 <CardDescription>Enter an identifier to view its complete traceability history.</CardDescription>
 </CardHeader>
 <CardContent className="pt-6">
 <form onSubmit={handleSearch} className="flex gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Enter bundle, log number, input number, or trim code..."
 value={search}
 onChange={(e: any) => setSearch(e.target.value)}
 className="pl-9 h-11 bg-background"
 />
 </div>
 <Button type="submit" disabled={loading || !search} className="h-11 px-6">
 {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
 Track
 </Button>
 </form>
 </CardContent>
 </Card>

 {error && (
 <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-medium">
 {error}
 </div>
 )}
 
 {!result && !error && !loading && (
 <Card className="border-dashed shadow-none bg-muted/30">
 <CardContent className="flex flex-col items-center justify-center p-16 text-center">
 <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
 <Search className="h-6 w-6 text-primary" />
 </div>
 <h3 className="text-lg font-semibold mb-1">Search a log to begin tracing</h3>
 <p className="text-sm text-muted-foreground max-w-md mx-auto">
 Enter a bundle number, input number, trim code, or raw log identifier to view its complete traceability history.
 </p>
 </CardContent>
 </Card>
 )}

 {result && (
 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <h3 className="text-lg font-semibold border-b pb-2">Traceability Timeline</h3>
 
 <Card>
 <CardHeader className="pb-2 bg-muted/30 border-b border-border/50">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Badge variant="success">SAWN TIMBER OUTPUT</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-4 text-sm">
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Bundle</span><strong className="text-[15px]">{result.bundleNumber}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Volume</span><strong className="text-[15px]">{result.totalM3} M&sup3;</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Created At</span><strong>{new Date(result.createdAt).toLocaleString()}</strong></div>
 </div>
 </CardContent>
 </Card>

 {result.parents?.map((parent: any, idx: number) => (
 <div key={idx} className="space-y-4">
 <div className="flex justify-center">
 <div className="h-8 w-px bg-border flex items-center justify-center">
 <div className="bg-background border rounded-full p-0.5"><ArrowDown className="w-3 h-3 text-muted-foreground" /></div>
 </div>
 </div>
 
 <Card>
 <CardHeader className="pb-2 bg-muted/30 border-b border-border/50">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Badge variant="info">INPUT LOG (WIP)</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-4 text-sm">
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Input Number</span><strong className="text-[15px]">{parent.inputNumber}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Machine</span><strong>{parent.machineName}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Date</span><strong>{new Date(parent.date).toLocaleDateString()}</strong></div>
 </div>
 </CardContent>
 </Card>

 {parent.sourceType === 'TRIMMED_LOG' && parent.trimmedLogs?.map((trim: any, tidx: number) => (
 <div key={tidx} className="pl-6 md:pl-12 mt-4 space-y-4 border-l-2 border-border ml-4">
 <Card className="ml-4">
 <CardHeader className="pb-2 bg-muted/30 border-b border-border/50">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Badge variant="warning">TRIMMED LOG</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-4 text-sm">
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Trim Code</span><strong className="text-[15px]">{trim.trimNumber}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Length</span><strong>{trim.length} m</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Gross Vol</span><strong>{trim.grossVolume} M&sup3;</strong></div>
 </div>
 </CardContent>
 </Card>
 
 {trim.rawLog && (
 <div className="pl-6 md:pl-12 mt-4 space-y-4 border-l-2 border-border ml-4">
 <Card className="ml-4">
 <CardHeader className="pb-2 bg-muted/30 border-b border-border/50">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Badge variant="secondary">RAW LOG</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-4 text-sm">
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Log Number</span><strong className="text-[15px]">{trim.rawLog.logNumber}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Species</span><strong>{trim.rawLog.species}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Supplier</span><strong>{trim.rawLog.supplier?.name}</strong></div>
 </div>
 </CardContent>
 </Card>
 </div>
 )}
 </div>
 ))}
 
 {parent.sourceType === 'RAW_LOG' && parent.rawLogs?.map((raw: any, ridx: number) => (
 <div key={ridx} className="pl-6 md:pl-12 mt-4 space-y-4 border-l-2 border-border ml-4">
 <Card className="ml-4">
 <CardHeader className="pb-2 bg-muted/30 border-b border-border/50">
 <CardTitle className="text-sm font-semibold flex items-center gap-2">
 <Badge variant="secondary">RAW LOG</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-4 text-sm">
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Log Number</span><strong className="text-[15px]">{raw.logNumber}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Species</span><strong>{raw.species}</strong></div>
 <div><span className="text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">Supplier</span><strong>{raw.supplier?.name}</strong></div>
 </div>
 </CardContent>
 </Card>
 </div>
 ))}
 </div>
 ))}
 </div>
 )}
 </div>
 )
}
