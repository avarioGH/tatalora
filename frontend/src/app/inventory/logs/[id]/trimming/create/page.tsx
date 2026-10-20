"use client"
import { useState, useEffect, use } from"react"
import { TimberAPI, InventoryAPI } from"@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Loader2, ArrowLeft, Save, Calculator, AlertCircle } from"lucide-react"
import { useRouter } from"next/navigation"
import { useToast } from"@/hooks/use-toast"

export default function CreateTrimmedLogPage({ params }: { params: Promise<{ id: string }> }) {
 const router = useRouter()
 const { toast } = useToast()
 const { id } = use(params)
 const [warehouses, setWarehouses] = useState<any[]>([])
 const [trimInfo, setTrimInfo] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [submitting, setSubmitting] = useState(false)

 const [form, setForm] = useState({
 length:"", diameter1:"", diameter2:"", diameter3:"", diameter4:"",
 gerowong:"", manualAvg:"", trimmingLength:"", barcode:"", locationId:"", notes:""
 })

 const [preview, setPreview] = useState({ avg: 0, rnd: 0, gross: 0, net: 0, diaClass:"" })

 useEffect(() => {
 Promise.all([
 InventoryAPI.getWarehouses(),
 TimberAPI.getRawLogTrimming(id)
 ]).then(([wRes, tRes]) => {
 setWarehouses(Array.isArray(wRes) ? wRes : [])
 setTrimInfo(tRes)
          if (tRes && tRes.parent) {
        const p = tRes.parent;
        setForm(prev => ({
          ...prev,
          diameter1: p.diameter1 ? p.diameter1.toString() : "",
          diameter2: p.diameter2 ? p.diameter2.toString() : "",
          diameter3: p.diameter3 ? p.diameter3.toString() : "",
          diameter4: p.diameter4 ? p.diameter4.toString() : "",
          manualAvg: p.averageDiameter ? p.averageDiameter.toString() : "",
          gerowong: p.gerowong ? p.gerowong.toString() : ""
        }))
      }
 }).catch(console.error).finally(() => setLoading(false))
 }, [id])

 useEffect(() => {
 const d1 = parseFloat(form.diameter1) || 0;
 const d2 = parseFloat(form.diameter2) || 0;
 const d3 = parseFloat(form.diameter3) || 0;
 const d4 = parseFloat(form.diameter4) || 0;
 const len = parseFloat(form.length) || 0;
 const gDia = parseFloat(form.gerowong) || 0;
 const tLen = parseFloat(form.trimmingLength) || 0;

    let avg = (d1 + d2 + d3 + d4) / 4;
   if (avg === 0 && parseFloat(form.manualAvg) > 0) {
     avg = parseFloat(form.manualAvg);
   }
 const rnd = Math.round(avg);
 
 let diaClass ="100 Cm Up";
 if (rnd < 40) diaClass ="30 - 39 Cm";
 else if (rnd < 50) diaClass ="40 - 49 Cm";
 else if (rnd < 60) diaClass ="50 - 59 Cm";
 else if (rnd < 70) diaClass ="60 - 69 Cm";
 else if (rnd < 80) diaClass ="70 - 79 Cm";
 else if (rnd < 90) diaClass ="80 - 89 Cm";
 else if (rnd < 100) diaClass ="90 - 99 Cm";

 const gross = (Math.pow(rnd, 2) * len * 0.7854) / 10000;
 const gVol = (Math.pow(gDia, 2) * (len - tLen) * 0.7854) / 10000;
 const tVol = (Math.pow(rnd, 2) * tLen * 0.7854) / 10000;
 const net = gross - gVol - tVol;

 setPreview({
 avg: Math.round(avg * 100) / 100, rnd, diaClass,
 gross: Math.round(gross * 100) / 100, net: Math.round(net * 1000000) / 1000000
 })
 }, [form])

 const handleSubmit = async (e: any) => {
 e.preventDefault()
 setSubmitting(true)
 try {
    await TimberAPI.createTrimmedLog(id, {
   ...form,
   length: parseFloat(form.length),
   diameter1: parseFloat(form.diameter1) || 0, 
   diameter2: parseFloat(form.diameter2) || 0,
   diameter3: parseFloat(form.diameter3) || 0, 
   diameter4: parseFloat(form.diameter4) || 0,
   averageDiameter: parseFloat(form.manualAvg) || 0,
   gerowong: form.gerowong ? parseFloat(form.gerowong) : null,
   trimmingLength: form.trimmingLength ? parseFloat(form.trimmingLength) : null
   })
 toast({ title:"Success", description:"Trimmed log added successfully." })
 router.push(`/inventory/logs/${id}`)
 } catch (err: any) {
 const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message; toast({ title:"Error", description: msg, variant:"destructive" }); alert("Gagal: " + msg);
 } finally {
 setSubmitting(false)
 }
 }

 if (loading) return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
 if (!trimInfo) return <div className="p-8 md:p-24 text-center">Failed to load parent log.</div>

 const remaining = trimInfo.remaining;
 const userLen = parseFloat(form.length) || 0;
 const isExceeding = userLen > remaining;

 return (
 <div className="space-y-6 pb-10">
 <div className="flex items-center gap-4 border-b pb-4">
 <Button variant="outline" size="icon" onClick={() => router.push(`/inventory/logs/${id}`)}><ArrowLeft className="w-4 h-4" /></Button>
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Add Trimming Child</h1>
 <p className="text-muted-foreground mt-1">Parent: <span className="font-bold text-primary">{trimInfo.parent.logNumber}</span></p>
 </div>
 </div>

 <div className="flex gap-8 p-4 bg-muted/30 rounded-lg border">
 <div><p className="text-sm text-muted-foreground">Original Length</p><p className="font-bold text-lg">{trimInfo.parent.originalLength} m</p></div>
 <div><p className="text-sm text-muted-foreground">Allocated</p><p className="font-bold text-lg text-primary">{trimInfo.allocated} m</p></div>
 <div><p className="text-sm text-muted-foreground">Remaining</p><p className="font-bold text-lg text-amber-600">{remaining} m</p></div>
 </div>

 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="md:col-span-2 space-y-6">
 <Card className="shadow-sm">
 <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-[16px] font-semibold">Measurements</CardTitle></CardHeader>
 <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="space-y-2 md:col-span-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Panjang Log Hasil (meters) <span className="text-red-500">*</span></label>
                  {remaining > 0 && (
                    <button type="button" onClick={() => setForm({...form, length: remaining.toString()})} className="text-xs text-primary hover:underline font-medium">
                      + Ambil Bagian Sisa ({remaining} m)
                    </button>
                  )}
                </div>
 <Input required type="number" step="0.01" value={form.length} onChange={e => setForm({...form, length: e.target.value})} className={isExceeding ?"border-red-500" :""} />
 {isExceeding && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Total panjang trimming melebihi panjang log induk.</p>}
 </div>
 <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">D1 (cm)</label><Input type="number" step="0.01" value={form.diameter1} onChange={e => setForm({...form, diameter1: e.target.value})} /></div>
 <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">D2 (cm)</label><Input type="number" step="0.01" value={form.diameter2} onChange={e => setForm({...form, diameter2: e.target.value})} /></div>
 <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">D3 (cm)</label><Input type="number" step="0.01" value={form.diameter3} onChange={e => setForm({...form, diameter3: e.target.value})} /></div>
 <div className="space-y-2"><label className="text-sm font-medium text-muted-foreground">D4 (cm)</label><Input type="number" step="0.01" value={form.diameter4} onChange={e => setForm({...form, diameter4: e.target.value})} /></div>
 <div className="space-y-2"><label className="text-sm font-medium">Avg &Oslash; (cm)</label><Input type="number" step="0.01" placeholder={preview.avg > 0 ? preview.avg.toFixed(1) : ""} value={form.manualAvg} onChange={e => setForm({...form, manualAvg: e.target.value})} /></div>
 <div className="space-y-2"><label className="text-sm font-medium">Gerowong &Oslash; (cm)</label><Input type="number" step="0.01" value={form.gerowong} onChange={e => setForm({...form, gerowong: e.target.value})} /></div>
 <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">Waste/Buangan Trimming (meters)</label><Input type="number" step="0.01" value={form.trimmingLength} onChange={e => setForm({...form, trimmingLength: e.target.value})} /></div>
 </CardContent>
 </Card>
 <Card className="shadow-sm">
 <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-[16px] font-semibold">Additional Info</CardTitle></CardHeader>
 <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2"><label className="text-sm font-medium">Location (Overrides Parent)</label>
 <Select value={form.locationId} onValueChange={(val) => setForm({...form, locationId: val ||""})}>
 <SelectTrigger><SelectValue placeholder="Inherit from parent" /></SelectTrigger>
 <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
 </Select>
 </div>
 <div className="space-y-2"><label className="text-sm font-medium">Custom Barcode</label><Input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Auto-generated if empty" /></div>
 </CardContent>
 </Card>
 </div>
 <div className="space-y-6">
 <Card className="shadow-sm border-border bg-muted/10">
 <CardHeader className="border-b border-border pb-4">
 <CardTitle className="text-lg flex items-center gap-2 text-foreground"><Calculator className="w-5 h-5" /> Live Preview</CardTitle>
 </CardHeader>
 <CardContent className="pt-6 space-y-4">
 <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Avg &Oslash;</span><span className="font-medium">{preview.avg} cm</span></div>
 <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Rounded &Oslash;</span><span className="font-bold text-lg">{preview.rnd} cm</span></div>
 <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Gross Volume</span><span className="font-medium">{preview.gross} m&sup3;</span></div>
 <hr className="border-border" />
 <div className="flex justify-between items-center"><span className="text-sm font-semibold text-foreground">Net Volume</span><span className="font-bold text-xl text-primary">{preview.net > 0 ? preview.net : 0} m&sup3;</span></div>
 </CardContent>
 </Card>
 <Button type="submit" disabled={submitting || preview.net < 0 || isExceeding || remaining <= 0} className="w-full h-12 text-lg">
 {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Save Child Log
 </Button>
 </div>
 </form>
 </div>
 )
}

