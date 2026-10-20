"use client"
import { useState } from"react"
import { TimberAPI } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Badge } from"@/components/ui/badge"
import { Loader2, Upload, FileSpreadsheet, Play, CheckCircle2, AlertCircle } from"lucide-react"
import { useRouter } from"next/navigation"
import { useToast } from"@/hooks/use-toast"

export default function ImportWizardPage() {
 const router = useRouter()
 const { toast } = useToast()
 const [step, setStep] = useState(1)
 const [file, setFile] = useState<File | null>(null)
 const [uploading, setUploading] = useState(false)
 const [session, setSession] = useState<any>(null)
 
 const [config, setConfig] = useState({ sheet:"", importType:"SAWN_TIMBER_OUTPUT" })
 const [preview, setPreview] = useState<any>(null)
 const [loading, setLoading] = useState(false)

 const handleUpload = async () => {
 if (!file) return
 setUploading(true)
 try {
 const fd = new FormData(); fd.append("file", file)
 const res = await TimberAPI.uploadImport(fd)
 setSession(res)
 setConfig({ ...config, sheet: res.sheets[0] ||"" })
 setStep(2)
 } catch (err: any) {
 toast({ title:"Upload Failed", description: err.message, variant:"destructive" })
 } finally { setUploading(false) }
 }

 const handlePreview = async () => {
 setLoading(true)
 try {
 const res = await TimberAPI.previewImport(session.id, config)
 setPreview(res)
 setStep(3)
 } catch (err: any) {
 toast({ title:"Preview Failed", description: err.message, variant:"destructive" })
 } finally { setLoading(false) }
 }

 const handleImport = async () => {
 setLoading(true)
 try {
 await TimberAPI.executeImport(session.id, config)
 toast({ title:"Success", description:"Import completed successfully." })
 router.push("/inventory/import/history")
 } catch (err: any) {
 toast({ title:"Import Failed", description: err.message, variant:"destructive" })
 } finally { setLoading(false) }
 }

 return (
 <div className="space-y-6 pb-10">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Excel Import Wizard</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Migrate historical inventory data from Excel safely.</p>
 </div>

 {step === 1 && (
 <Card className="shadow-sm max-w-2xl">
 <CardHeader><CardTitle>Step 1: Upload Excel File</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 <div className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors">
 <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
 <Input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} className="max-w-xs mx-auto" />
 </div>
 <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
 {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Upload & Parse
 </Button>
 </CardContent>
 </Card>
 )}

 {step === 2 && (
 <Card className="shadow-sm max-w-2xl">
 <CardHeader><CardTitle>Step 2: Configuration</CardTitle><CardDescription>File: {session.fileName}</CardDescription></CardHeader>
 <CardContent className="space-y-6">
 <div className="space-y-2">
 <label className="text-sm font-medium">Select Excel Sheet</label>
 <Select value={config.sheet} onValueChange={v => setConfig({...config, sheet: v || ''})}>
 <SelectTrigger><SelectValue/></SelectTrigger>
 <SelectContent>{session.sheets?.map((s:string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Data Type</label>
 <Select value={config.importType} onValueChange={v => setConfig({...config, importType: v || ''})}>
 <SelectTrigger><SelectValue/></SelectTrigger>
 <SelectContent>
 <SelectItem value="SAWN_TIMBER_OUTPUT">Sawn Timber Output (Produksi)</SelectItem>
 <SelectItem value="STOCK_OPENING_BALANCE">Stock Opening Balance</SelectItem>
 <SelectItem value="RAW_LOG">Raw Log (DUKB)</SelectItem>
 <SelectItem value="TRIMMING_LOG">Trimming Log</SelectItem>
 <SelectItem value="INPUT_LOG">Input Log (WIP)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="flex gap-4">
 <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
 <Button onClick={handlePreview} disabled={loading} className="flex-1">
 {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Run Dry Run Preview
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {step === 3 && preview && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Total Rows</p><p className="text-3xl font-bold">{preview.validRows + preview.invalidRows}</p></CardContent></Card>
 <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Valid</p><p className="text-3xl font-bold text-primary">{preview.validRows}</p></CardContent></Card>
 <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Errors</p><p className="text-3xl font-bold text-red-600">{preview.invalidRows}</p></CardContent></Card>
 <Card><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Total M&sup3;</p><p className="text-3xl font-bold text-primary">{preview.totalM3.toFixed(4)}</p></CardContent></Card>
 </div>

 <Card>
 <CardHeader className="pb-4 border-b border-border/40"><CardTitle>Data Preview (First 100 Rows)</CardTitle></CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left">
 <thead className="bg-muted/50"><tr><th className="p-3">Status</th><th className="p-3">Data</th><th className="p-3 text-right">Excel M&sup3;</th><th className="p-3 text-right">Calc M&sup3;</th></tr></thead>
 <tbody>
 {preview.rows.map((r:any, i:number) => (
 <tr key={i} className="border-b">
 <td className="p-3">
 <Badge variant={r._status==="ERROR"?"destructive":r._status==="WARNING"?"secondary":"default"}>{r._status}</Badge>
 {r._error && <p className="text-xs text-red-500 mt-1">{r._error}</p>}
 </td>
 <td className="p-3"><pre className="text-xs">{JSON.stringify({ ...r, _status: undefined, _error: undefined, _calcM3: undefined, _excelM3: undefined }, null, 2)}</pre></td>
 <td className="p-3 text-right">{r._excelM3}</td>
 <td className="p-3 text-right">{r._calcM3?.toFixed(6)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </CardContent>
 </Card>

 <div className="flex gap-4 max-w-2xl">
 <Button variant="outline" onClick={() => setStep(2)}>Back to Config</Button>
 <Button onClick={handleImport} disabled={loading || preview.invalidRows > 0} className="flex-1 ">
 {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Execute Final Import
 </Button>
 </div>
 </div>
 )}
 </div>
 )
}

