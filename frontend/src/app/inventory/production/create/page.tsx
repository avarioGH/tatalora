"use client"
import { useState, useEffect } from "react"
import { ProductionAPI, TimberAPI, InventoryAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, Plus, Trash2, Hammer, Package, LogOut, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function CreateProductionPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [stocks, setStocks] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [form, setForm] = useState({ date: "", type: "GESEK", notes: "" })
  const [inputs, setInputs] = useState<any[]>([])
  const [outputs, setOutputs] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      TimberAPI.getTimberStock().catch(() => ({ items: [] })),
      InventoryAPI.getProducts().catch(() => [])
    ]).then(([sRes, pRes]: any) => {
      setStocks(Array.isArray(sRes?.items) ? sRes.items : (Array.isArray(sRes) ? sRes : []))
      setProducts(Array.isArray(pRes) ? pRes : [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const addInput = () => {
    setInputs([...inputs, { timberStockId: "", quantity: 1 }])
  }

  const addOutput = () => {
    setOutputs([...outputs, { variantId: "", type: "PRODUCT", quantity: 1, remarks: "" }])
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.date) return toast({ title: "Validasi Gagal", description: "Tanggal harus diisi", variant: "destructive" })
    if (inputs.length === 0) return toast({ title: "Validasi Gagal", description: "Minimal 1 input", variant: "destructive" })
    if (outputs.length === 0) return toast({ title: "Validasi Gagal", description: "Minimal 1 output", variant: "destructive" })

    setSubmitting(true)
    try {
      const payload = {
        date: form.date,
        type: form.type,
        notes: form.notes,
        inputs: inputs.map(i => ({ timberStockId: i.timberStockId, quantity: parseInt(i.quantity) })),
        outputs: outputs.map(o => ({ variantId: o.variantId, type: o.type, quantity: parseInt(o.quantity), remarks: o.remarks }))
      }
      await ProductionAPI.createProcess(payload)
      toast({ title: "Berhasil", description: "Production Process berhasil dibuat" })
      router.push('/inventory/production')
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Gagal menyimpan", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

  const inputTotal = inputs.reduce((acc, curr) => acc + (parseInt(curr.quantity) || 0), 0);
  const outputTotal = outputs.reduce((acc, curr) => acc + (parseInt(curr.quantity) || 0), 0);

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/inventory/production')} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
               New Production
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Record a new production activity (Gesek, Plat, Masak).</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> PRODUCTION INFORMATION</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-foreground/90">Process Type <span className="text-destructive">*</span></label>
              <Select value={form.type} onValueChange={(val) => setForm({...form, type: val || ""})}>
                <SelectTrigger className="bg-background h-10"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESEK">GESEK</SelectItem>
                  <SelectItem value="PLAT">PLAT</SelectItem>
                  <SelectItem value="MASAK">MASAK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-foreground/90">Date <span className="text-destructive">*</span></label>
              <Input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-background h-10" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[13px] font-semibold text-foreground/90">Notes / Operator</label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional remarks or operator name..." className="bg-background h-10" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600"><LogOut className="w-4 h-4" /> INPUT MATERIAL</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addInput} className="h-8 shadow-sm text-xs font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1.5"/> Add Input
            </Button>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {inputs.map((inp, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border border-border/60 rounded-lg bg-background/50">
                <div className="w-full sm:flex-1 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Timber Stock <span className="text-destructive">*</span></label>
                  <Select value={inp.timberStockId} onValueChange={(val) => {
                    const newInputs = [...inputs]; newInputs[idx].timberStockId = val || ""; setInputs(newInputs);
                  }}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Timber Stock..."/></SelectTrigger>
                    <SelectContent>
                      {stocks.map(s => <SelectItem key={s.id} value={s.id}>{s.bundleNumber || s.id} - {s.timberVariant?.sku || 'Unknown'} (Qty: {s.quantityPcs})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-32 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Qty <span className="text-destructive">*</span></label>
                  <Input type="number" min="1" value={inp.quantity} onChange={(e) => {
                    const newInputs = [...inputs]; newInputs[idx].quantity = e.target.value; setInputs(newInputs);
                  }} className="bg-background font-bold text-center" placeholder="Qty" required />
                </div>
                <div className="w-full sm:w-auto pt-0 sm:pt-5">
                  <Button type="button" variant="ghost" onClick={() => setInputs(inputs.filter((_, i) => i !== idx))} className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 sm:mr-0 mr-2"/> <span className="sm:hidden">Remove Input</span>
                  </Button>
                </div>
              </div>
            ))}
            {inputs.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-3">No input materials added yet.</p>
                <Button type="button" variant="outline" size="sm" onClick={addInput}><Plus className="w-4 h-4 mr-2"/> Add First Input</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-600"><Package className="w-4 h-4" /> OUTPUT / RESULT</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addOutput} className="h-8 shadow-sm text-xs font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1.5"/> Add Output
            </Button>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            {outputs.map((out, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-4 border border-border/60 rounded-lg bg-background/50">
                <div className="w-full md:flex-1 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Product Variant <span className="text-destructive">*</span></label>
                  <Select value={out.variantId} onValueChange={(val) => {
                    const newOutputs = [...outputs]; newOutputs[idx].variantId = val || ""; setOutputs(newOutputs);
                  }}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select Product..."/></SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-32 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Type <span className="text-destructive">*</span></label>
                  <Select value={out.type} onValueChange={(val) => {
                    const newOutputs = [...outputs]; newOutputs[idx].type = val || "PRODUCT"; setOutputs(newOutputs);
                  }}>
                    <SelectTrigger className="bg-background"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCT">PRODUCT</SelectItem>
                      <SelectItem value="WASTE">WASTE</SelectItem>
                      <SelectItem value="BYPRODUCT">BYPRODUCT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-28 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Qty <span className="text-destructive">*</span></label>
                  <Input type="number" min="1" value={out.quantity} onChange={(e) => {
                    const newOutputs = [...outputs]; newOutputs[idx].quantity = e.target.value; setOutputs(newOutputs);
                  }} className="bg-background font-bold text-center text-emerald-600" placeholder="Qty" required />
                </div>
                <div className="w-full md:w-48 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Remarks</label>
                  <Input value={out.remarks} onChange={(e) => {
                    const newOutputs = [...outputs]; newOutputs[idx].remarks = e.target.value; setOutputs(newOutputs);
                  }} className="bg-background" placeholder="Grade/Notes" />
                </div>
                <div className="w-full md:w-auto pt-0 md:pt-5">
                  <Button type="button" variant="ghost" onClick={() => setOutputs(outputs.filter((_, i) => i !== idx))} className="w-full md:w-auto text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 md:mr-0 mr-2"/> <span className="md:hidden">Remove Output</span>
                  </Button>
                </div>
              </div>
            ))}
            {outputs.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-3">No output products added yet.</p>
                <Button type="button" variant="outline" size="sm" onClick={addOutput}><Plus className="w-4 h-4 mr-2"/> Add First Output</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SUMMARY & SUBMIT */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20 p-4 md:p-6 rounded-xl border border-border">
          <div className="flex gap-6 w-full sm:w-auto">
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">Total Inputs</p>
              <p className="text-2xl font-black text-rose-600">{inputTotal} <span className="text-sm font-medium text-muted-foreground">PCS</span></p>
            </div>
            <div className="w-px bg-border"></div>
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-1">Total Outputs</p>
              <p className="text-2xl font-black text-emerald-600">{outputTotal} <span className="text-sm font-medium text-muted-foreground">PCS</span></p>
            </div>
          </div>
          
          <Button type="submit" disabled={submitting || inputs.length === 0 || outputs.length === 0} className="w-full sm:w-auto h-12 px-8 font-semibold text-[15px] bg-primary hover:bg-primary/90 shadow-lg">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {submitting ? 'Saving...' : 'Save Production Draft'}
          </Button>
        </div>
      </form>
    </div>
  )
}
