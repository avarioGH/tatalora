"use client"
import { useState, useEffect } from "react"
import { TimberAPI, InventoryAPI, MasterDataAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, Info, MapPin, Box, Factory, Ruler } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function CreateOutputPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partaiIdFromUrl = searchParams.get('partaiId') || '';
  const inputLogIdFromUrl = searchParams.get('inputLogId') || '';
  const { toast } = useToast()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [inputLogs, setInputLogs] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({ partaiId: partaiIdFromUrl, date: "", shift: "1", locationId: "", inputLogId: inputLogIdFromUrl, batch: "", notes: "", consumedVolume: "" })
  const [item, setItem] = useState({ gradeId: "", grade: "", thickness: "", width: "", length: "", quantityPcs: "" })
  const [preview, setPreview] = useState(0)

  useEffect(() => {
    Promise.all([
      InventoryAPI.getWarehouses(),
      TimberAPI.getInputLogs({ status: "AVAILABLE,IN_PROCESS" }).catch(() => ({ items: [] })),
      MasterDataAPI.getGrades().catch(() => [])
    ]).then(([wRes, lRes, gRes]: any) => {
      setWarehouses(Array.isArray(wRes) ? wRes : [])
      setInputLogs(Array.isArray(lRes?.items) ? lRes.items : [])
      setGrades(Array.isArray(gRes) ? gRes.filter(g => g.isActive !== false) : [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = parseFloat(item.thickness) || 0
    const w = parseFloat(item.width) || 0
    const l = parseFloat(item.length) || 0
    const q = parseInt(item.quantityPcs) || 0
    const vol = (t * w * l * q) / 1000000000
    setPreview(vol)
  }, [item])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.inputLogId) { toast({ title: "Validasi Gagal", description: "Source Input Log harus dipilih", variant: "destructive" }); return; }
    if (!form.locationId) { toast({ title: "Validasi Gagal", description: "Warehouse harus dipilih", variant: "destructive" }); return; }
    if (!form.date) { toast({ title: "Validasi Gagal", description: "Tanggal harus diisi", variant: "destructive" }); return; }
      if (!item.gradeId) { toast({ title: "Validasi Gagal", description: "Grade wajib dipilih", variant: "destructive" }); return; }
    if (!item.thickness || !item.width || !item.length) { toast({ title: "Validasi Gagal", description: "Dimensi (thickness, width, length) harus diisi", variant: "destructive" }); return; }
    if (!item.quantityPcs || parseInt(item.quantityPcs) <= 0) { toast({ title: "Validasi Gagal", description: "Quantity harus lebih dari 0", variant: "destructive" }); return; }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        outputDate: form.date,
        items: [{
          gradeId: item.gradeId === 'PENDING' ? undefined : item.gradeId,
          grade: item.grade,
          thickness: parseFloat(item.thickness),
          width: parseFloat(item.width),
          length: parseFloat(item.length),
          quantityPcs: parseInt(item.quantityPcs)
        }]
      }
      await TimberAPI.createSawnOutput(payload)
      toast({ title: "Berhasil", description: "Output berhasil dibuat (status: DRAFT)" })
      router.push('/inventory/sawn-timber/output')
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Gagal menyimpan", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      
      {/* Header section */}
      <div className="flex items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <Button variant="outline" size="icon" onClick={() => router.push('/inventory/sawn-timber/output')} className="shrink-0 h-10 w-10">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Create Sawn Timber Output
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Record new finished timber output from production.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* General Info */}
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> OUTPUT INFORMATION</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-foreground/90">Source Input Log <span className="text-destructive">*</span></label>
              <Select value={form.inputLogId} onValueChange={(val) => setForm({...form, inputLogId: val || ""})}>
                <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Select Input Log..."/></SelectTrigger>
                <SelectContent>
                  {inputLogs.map(l => <SelectItem key={l.id} value={l.id}>{l.inputNumber} - {l.species} (Qty: {l.totalPcs})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-foreground/90">Warehouse Location <span className="text-destructive">*</span></label>
              <Select value={form.locationId} onValueChange={(val) => setForm({...form, locationId: val || ""})}>
                <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Select Warehouse..."/></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-foreground/90">Date <span className="text-destructive">*</span></label>
              <Input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-background h-10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-foreground/90">Shift</label>
                <Select value={form.shift} onValueChange={(val) => setForm({...form, shift: val || "1"})}>
                  <SelectTrigger className="bg-background h-10"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Shift 1</SelectItem>
                    <SelectItem value="2">Shift 2</SelectItem>
                    <SelectItem value="3">Shift 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-foreground/90">Partai</label>
                <Input value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} placeholder="Batch Code" className="bg-background h-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2"><Box className="w-4 h-4 text-emerald-600" /> TIMBER VARIANT</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 grid grid-cols-1 gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Grade <span className="text-destructive">*</span></label>
                                <Select value={item.gradeId} onValueChange={(val) => {
                  if (val === "PENDING") {
                    setItem({...item, gradeId: "PENDING", grade: "PENDING"});
                  } else {
                    const selected = grades.find(g => g.id === val);
                    setItem({...item, gradeId: val || "", grade: selected ? selected.code : ""});
                  }
                }}>
                  <SelectTrigger className="bg-background h-10">
                    <SelectValue placeholder="Pilih Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING" className="text-destructive font-bold">Belum Diisi (PENDING)</SelectItem>
                    {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5" /> Dimensions (mm) <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Input type="number" min="1" value={item.thickness} onChange={e => setItem({...item, thickness: e.target.value})} placeholder="Thickness" required className="bg-background h-10 font-medium" />
                  <p className="text-[10px] text-muted-foreground text-center">T</p>
                </div>
                <div className="space-y-1">
                  <Input type="number" min="1" value={item.width} onChange={e => setItem({...item, width: e.target.value})} placeholder="Width" required className="bg-background h-10 font-medium" />
                  <p className="text-[10px] text-muted-foreground text-center">W</p>
                </div>
                <div className="space-y-1">
                  <Input type="number" min="1" value={item.length} onChange={e => setItem({...item, length: e.target.value})} placeholder="Length" required className="bg-background h-10 font-medium" />
                  <p className="text-[10px] text-muted-foreground text-center">L</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Quantity (PCS) <span className="text-destructive">*</span></label>
                <Input type="number" min="1" value={item.quantityPcs} onChange={e => setItem({...item, quantityPcs: e.target.value})} placeholder="Total Pieces" required className="bg-background h-10 font-bold text-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Calculated Volume (M³)</label>
                <div className="h-10 px-3 bg-primary/5 border border-primary/20 rounded-md flex items-center justify-end">
                  <span className="font-black text-primary text-lg">{preview > 0 ? preview.toFixed(6) : "0.000000"}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Additional Notes</label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Remarks..." className="bg-background h-10" />
            </div>

          </CardContent>
        </Card>

        {/* SUBMIT */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto h-12 px-8 font-semibold text-[15px] bg-primary hover:bg-primary/90 shadow-lg">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {submitting ? 'Saving...' : 'Create Output Draft'}
          </Button>
        </div>
      </form>
    </div>
  )
}






