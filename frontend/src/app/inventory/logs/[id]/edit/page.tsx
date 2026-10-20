"use client"
import { useState, useEffect, use } from "react"
import { TimberAPI, InventoryAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, Calculator } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function EditRawLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    logNumber: "",
    species: "Ulin Lokal",
    batch: "",
    locationId: "",
    receivingDate: "",
    originalLength: "",
    diameter1: "",
    diameter2: "",
    diameter3: "",
    diameter4: "",
    averageDiameter: "",
    gerowong: "",
    barcode: ""
  })

  useEffect(() => {
    Promise.all([
      InventoryAPI.getWarehouses(),
      TimberAPI.getRawLog(id)
    ]).then(([wRes, lRes]) => {
      setWarehouses(Array.isArray(wRes) ? wRes : [])
      if (lRes) {
        setForm({
          logNumber: lRes.logNumber || "",
          species: lRes.species || "Ulin Lokal",
          batch: lRes.batch || "",
          locationId: lRes.locationId || "",
          receivingDate: lRes.receivingDate ? lRes.receivingDate.substring(0, 10) : "",
          originalLength: lRes.originalLength || "",
          diameter1: lRes.diameter1 || "",
          diameter2: lRes.diameter2 || "",
          diameter3: lRes.diameter3 || "",
          diameter4: lRes.diameter4 || "",
          averageDiameter: lRes.averageDiameter || "",
          gerowong: lRes.gerowong || "",
          barcode: lRes.barcode || ""
        })
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const calculatePreview = () => {
    const l = parseFloat(form.originalLength) || 0
    const d1 = parseFloat(form.diameter1) || 0
    const d2 = parseFloat(form.diameter2) || 0
    const d3 = parseFloat(form.diameter3) || 0
    const d4 = parseFloat(form.diameter4) || 0
    const g = parseFloat(form.gerowong) || 0

    let avgDiaStrict = (d1 + d2 + d3 + d4) / 4; 
    if (avgDiaStrict === 0 && parseFloat(form.averageDiameter) > 0) {
      avgDiaStrict = parseFloat(form.averageDiameter);
    }
    const rndDia = Math.round(avgDiaStrict);
    
    const grossVol = l > 0 && rndDia > 0 ? (Math.pow(rndDia, 2) * l * 0.7854) / 10000 : 0
    const gerowongVol = l > 0 && g > 0 ? (Math.pow(g, 2) * l * 0.7854) / 10000 : 0
    const netVol = grossVol - gerowongVol

    return { avg: avgDiaStrict, rnd: rndDia, gross: grossVol, hollow: gerowongVol, net: netVol > 0 ? netVol : 0 }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await TimberAPI.updateLog(id, {
        ...form,
        originalLength: parseFloat(form.originalLength) || 0,
        diameter1: parseFloat(form.diameter1) || 0,
        diameter2: parseFloat(form.diameter2) || 0,
        diameter3: parseFloat(form.diameter3) || 0,
        diameter4: parseFloat(form.diameter4) || 0,
        averageDiameter: parseFloat(form.averageDiameter) || 0,
        gerowong: parseFloat(form.gerowong) || 0,
      })
      toast({ title: "Berhasil", description: "Log berhasil diperbarui." })
      router.push('/inventory/logs')
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Gagal memperbarui log.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

  const calc = calculatePreview()

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/inventory/logs')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Edit Raw Log</h1>
          <p className="text-muted-foreground mt-1">Perbarui data individu kayu log.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <CardTitle className="text-[16px] font-semibold">Log Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Log Number *</label>
                <Input required value={form.logNumber} onChange={e => setForm({...form, logNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Barcode</label>
                <Input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Species *</label>
                <Select value={form.species} onValueChange={v => setForm({...form, species: v || ''})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ulin Lokal">Ulin Lokal</SelectItem>
                    <SelectItem value="Ulin Impor">Ulin Impor</SelectItem>
                    <SelectItem value="Meranti">Meranti</SelectItem>
                    <SelectItem value="Bengkirai">Bengkirai</SelectItem>
                    <SelectItem value="Kapur">Kapur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Partai</label>
                <Input value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Warehouse</label>
                <Select value={form.locationId} onValueChange={v => setForm({...form, locationId: v || ''})}>
                  <SelectTrigger>
                    {form.locationId ? warehouses.find(w => w.id === form.locationId)?.name : <SelectValue placeholder="Pilih Warehouse..."/>}
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Receiving Date</label>
                <Input type="date" value={form.receivingDate} onChange={e => setForm({...form, receivingDate: e.target.value})} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/10 pb-4">
              <CardTitle className="text-[16px] font-semibold">Dimensions (Measurements)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-primary">Length (m) *</label>
                <Input required type="number" step="0.1" value={form.originalLength} onChange={e => setForm({...form, originalLength: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Avg &Oslash; (cm)</label>
                <Input type="number" step="0.1" value={form.averageDiameter} onChange={e => setForm({...form, averageDiameter: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive">Gerowong (cm)</label>
                <Input type="number" step="0.1" value={form.gerowong} onChange={e => setForm({...form, gerowong: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">D1 (cm)</label>
                <Input type="number" step="0.1" value={form.diameter1} onChange={e => setForm({...form, diameter1: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">D2 (cm)</label>
                <Input type="number" step="0.1" value={form.diameter2} onChange={e => setForm({...form, diameter2: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">D3 (cm)</label>
                <Input type="number" step="0.1" value={form.diameter3} onChange={e => setForm({...form, diameter3: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">D4 (cm)</label>
                <Input type="number" step="0.1" value={form.diameter4} onChange={e => setForm({...form, diameter4: e.target.value})} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border border-primary/20 bg-card">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Calculator className="w-5 h-5"/> Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">&Oslash; Average</span>
                <span className="font-medium text-foreground">{calc.avg.toFixed(2)} cm</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">&Oslash; Rounded</span>
                <span className="font-medium text-foreground">{calc.rnd} cm</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gross M&sup3;</span>
                <span className="font-medium text-foreground">{calc.gross.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground text-destructive">Hollow M&sup3;</span>
                <span className="font-medium text-destructive">{calc.hollow > 0 ? '-' : ''}{calc.hollow.toFixed(4)}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">Net M&sup3;</span>
                <span className="font-bold text-2xl text-primary">
                  {calc.net.toFixed(4)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Button type="submit" disabled={submitting} className="w-full h-12 text-lg">
            {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Update Data Log
          </Button>
        </div>
      </form>
    </div>
  )
}