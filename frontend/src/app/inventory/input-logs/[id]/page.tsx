"use client"
import { useState, useEffect, use } from "react"
import { TimberAPI, api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ArrowLeft, ArrowRight, Box, CheckCircle2, Factory, Calendar, Package, Plus, Trash, Check, Edit, X, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function InputLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Tally Modal State
  const [tallyOpen, setTallyOpen] = useState(false)
  const [tallyLines, setTallyLines] = useState([{ t: "", l: "", p: "", pcs: "", productType: "BALOK" }])
  const [tallyDate, setTallyDate] = useState(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0])
  const [savingTally, setSavingTally] = useState(false)

  // Edit states
  const [editTallyOpen, setEditTallyOpen] = useState(false)
  const [editTallyId, setEditTallyId] = useState("")
  const [editTallyDate, setEditTallyDate] = useState("")
  const [editTallyStatus, setEditTallyStatus] = useState("")
  const [editTallyLines, setEditTallyLines] = useState<{t:string, l:string, p:string, pcs:string}[]>([])
  const [deletingId, setDeletingId] = useState("")
  
  // Status Update State
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const loadData = () => {
    setLoading(true)
    TimberAPI.getInputLog(id)
      .then(setData)
      .catch((err: any) => setError(err?.response?.data?.message || "Gagal memuat data input log"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setUpdatingStatus(true)
      await api.post(`/inventory/input-logs/${id}/status`, { status: newStatus })
      toast({ title: "Status Diperbarui", description: `Status WIP berubah menjadi ${newStatus}.` })
      loadData()
    } catch (err: any) {
      toast({ title: "Gagal Merubah Status", description: err?.response?.data?.message || err.message, variant: "destructive" })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDeleteTally = async (tallyId: string, status: string) => {
    if (!confirm("Hapus tally ini? Jika sudah POSTED, stok akan direverse (dibatalkan).")) return;
    setDeletingId(tallyId);
    try {
      if (status === "POSTED") {
        await TimberAPI.cancelSawnOutput(tallyId);
      }
      await TimberAPI.deleteSawnOutput(tallyId);
      toast({ title: "Berhasil", description: "Tally berhasil dihapus." });
      loadData();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.response?.data?.message || "Gagal menghapus tally.", variant: "destructive" });
    } finally {
      setDeletingId("");
    }
  }

  const openEditDialog = (o: any) => {
    setEditTallyId(o.id);
    setEditTallyStatus(o.status);
    setEditTallyDate(o.outputDate ? new Date(o.outputDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
    setEditTallyLines(o.items.map((i: any) => ({
      t: (i.thicknessMm / 10).toString(),
      l: (i.widthMm / 10).toString(),
      p: (i.lengthMm / 10).toString(),
      pcs: i.quantityPcs.toString()
    })));
    setEditTallyOpen(true);
  }

  const handleSaveEdit = async () => {
    try {
      const validLines = editTallyLines.filter(line => Number(line.t) > 0 && Number(line.l) > 0 && Number(line.p) > 0 && Number(line.pcs) > 0)
      if (validLines.length === 0) {
        toast({ title: "Input Tidak Valid", description: "Mohon isi setidaknya satu baris dimensi dengan benar.", variant: "destructive" })
        return
      }

      setSavingTally(true)
      
      if (editTallyStatus === "POSTED") {
        await TimberAPI.cancelSawnOutput(editTallyId);
      }

      const payload = {
        outputDate: editTallyDate,
        items: validLines.map(line => ({
          timberVariantId: undefined, 
          thickness: parseFloat(line.t) * 10,
          width: parseFloat(line.l) * 10,
          length: parseFloat(line.p) * 10,
          quantityPcs: parseInt(line.pcs),
          grade: "A"
        }))
      }

      await TimberAPI.updateSawnOutput(editTallyId, payload);
      await api.post('/inventory/sawn-timber/output/' + editTallyId + '/post');

      toast({ title: "Berhasil", description: "Tally berhasil diperbarui." })
      setEditTallyOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: "Gagal", description: (err.response?.data?.error?.message || err.response?.data?.message) || err.message, variant: "destructive" })
    } finally {
      setSavingTally(false)
    }
  }

  const handleSaveTally = async () => {
    try {
      // Validate
      const validLines = tallyLines.filter(line => Number(line.t) > 0 && Number(line.l) > 0 && Number(line.p) > 0 && Number(line.pcs) > 0)
      if (validLines.length === 0) {
        toast({ title: "Input Tidak Valid", description: "Mohon isi setidaknya satu baris dimensi dengan benar.", variant: "destructive" })
        return
      }
      
      if (!data.locationId) {
        toast({ title: "Error", description: "WIP tidak memiliki gudang yang valid.", variant: "destructive" })
        return
      }

      setSavingTally(true)
      
      let whId = data?.locationId;
        try {
           const stored = localStorage.getItem('active_warehouse');
           if (stored) whId = JSON.parse(stored).id;
        } catch(e) {}
        
        const payload = {
        inputLogId: id,
        partaiId: data.partaiId,
        outputDate: tallyDate,
        locationId: whId,
        items: validLines.map(line => ({
          thickness: parseFloat(line.t) * 10,
          width: parseFloat(line.l) * 10,
          length: parseFloat(line.p) * 10,
          quantityPcs: parseInt(line.pcs),
          grade: "PENDING",
          productType: line.productType || "BALOK"
        }))
      }

      const res = await api.post('/inventory/sawn-timber/output', payload)
      // Auto-post the tally so it enters inventory
      await api.post(`/inventory/sawn-timber/output/${res.data.id}/post`)
      
      toast({ title: "Berhasil", description: "Tally harian berhasil disimpan dan di-posting." })
      setTallyOpen(false)
      setTallyLines([{ t: "", l: "", p: "", pcs: "", productType: "BALOK" }])
      loadData()
    } catch (err: any) {
      toast({ title: "Gagal Menyimpan Tally", description: err?.response?.data?.error?.message || err?.response?.data?.message || err.message, variant: "destructive" }); alert("Gagal Tally: " + (err?.response?.data?.error?.message || err?.response?.data?.message || err.message));
    } finally {
      setSavingTally(false)
    }
  }

  if (loading) return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  if (error || !data) return (
    <div className="p-8 md:p-24 flex flex-col items-center justify-center gap-4 text-center">
      <Package className="w-10 h-10 text-muted-foreground opacity-40" />
      <p className="text-base font-semibold text-foreground">{error || "Input log tidak ditemukan."}</p>
      <Button variant="outline" onClick={() => router.push("/inventory/partai")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
      </Button>
    </div>
  )

  const totalInputVol = Number(data.totalVolume || 0)
  const outItems = (data.sawnOutputs || []).flatMap((o: any) => o.items || [])
  const totalOutputVol = outItems.reduce((acc: number, cur: any) => acc + (cur.volumeM3 || 0), 0)
  const progressPct = totalInputVol > 0 ? Math.min(100, Math.round((totalOutputVol / totalInputVol) * 100)) : 0

  return (
    <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => router.push(data.partaiId ? `/inventory/partai/${data.partaiId}` : '/inventory/input-logs')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Job Card: {data.inputNumber}
                {data.status === 'DONE' ? <Badge className="bg-emerald-500 hover:bg-emerald-600 text-sm py-1">DONE</Badge> 
                  : data.status === 'IN_PROCESS' ? <Badge className="bg-amber-500 hover:bg-amber-600 text-sm py-1">IN PROCESS</Badge> 
                  : <Badge className="bg-rose-500 hover:bg-rose-600 text-sm py-1">AVAILABLE</Badge>}
              </h1>
              <div className="flex items-center text-muted-foreground mt-1 space-x-4 text-sm">
                <span className="flex items-center"><Calendar className="w-4 h-4 mr-1"/> {data.date ? new Date(data.date).toLocaleDateString("id-ID") : "-"}</span>
                <span className="flex items-center"><Box className="w-4 h-4 mr-1"/> {data.species}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {data.status === 'AVAILABLE' && (
            <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => handleUpdateStatus('IN_PROCESS')} disabled={updatingStatus}>
              {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Factory className="w-4 h-4 mr-2" />} Mulai Pekerjaan
            </Button>
          )}
          {data.status === 'IN_PROCESS' && (
            <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => handleUpdateStatus('DONE')} disabled={updatingStatus}>
              {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Tandai Selesai
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* LEFT COL: STATS & PROGRESS */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="bg-muted/30 p-4 border-b">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Factory className="w-4 h-4 text-primary" /> Produksi M&sup3;</h3>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Input Bahan Baku</div>
                  <div className="text-2xl font-bold">{totalInputVol.toFixed(4)} <span className="text-sm font-normal text-muted-foreground">m&sup3;</span></div>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Output Sawn Timber</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalOutputVol.toFixed(4)} <span className="text-sm font-normal text-muted-foreground">m&sup3;</span></div>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium">Rendemen (Yield)</div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{progressPct}%</div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COL: MATERIAL & TALLY */}
        <div className="md:col-span-3 space-y-6">
          
          <Card className="bg-card rounded-xl border border-border shadow-sm">
            <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[16px] font-semibold">Source Material (Trimmed / Raw Logs)</CardTitle>
                <CardDescription>Bahan baku yang dikonsumsi oleh pekerjaan ini.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="h-10 text-xs">LOG ID / CODE</TableHead>
                      <TableHead className="h-10 text-xs text-right">PJG (m)</TableHead>
                      <TableHead className="h-10 text-xs text-right">RT (cm)</TableHead>
                      <TableHead className="h-10 text-xs text-right text-emerald-600">VOL (m&sup3;)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.items || []).map((item: any) => {
                      const logNum = item.trimmedLog?.trimNumber || item.rawLog?.logNumber || "N/A"
                      const pjg = item.trimmedLog?.length || item.rawLog?.length || 0
                      const rt = item.trimmedLog?.averageDiameter || item.rawLog?.averageDiameter || 0
                      const vol = item.volume || 0
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{logNum}</TableCell>
                          <TableCell className="text-right">{pjg}</TableCell>
                          <TableCell className="text-right">{rt}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{vol.toFixed(4)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-xl border border-border shadow-sm">
            <CardHeader className="p-4 md:p-5 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[16px] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Production History (Tallies)
                </CardTitle>
                <CardDescription>Catatan output per hari dari gergajian ini.</CardDescription>
              </div>
              <Dialog open={tallyOpen} onOpenChange={setTallyOpen}>
                <DialogTrigger>
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-emerald-600 text-primary-foreground shadow hover:bg-emerald-700 h-8 rounded-md px-3" style={data.status === "DONE" ? {opacity: 0.5, pointerEvents: "none"} : {}}><Plus className="w-4 h-4" /> Tally Hari Ini</div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Input Tally Harian</DialogTitle>
                    <DialogDescription>Masukkan hasil produksi gergajian. Sistem otomatis menghitung M&sup3; (T &times; L &times; P &times; PCS &divide; 1.000.000).</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4 overflow-x-auto">
                    <div className="w-1/3">
                      <Label>Tanggal Produksi</Label>
                      <Input type="date" value={tallyDate} onChange={e => setTallyDate(e.target.value)} />
                    </div>
                    
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted">
                          <TableRow>
                            <TableHead className="min-w-[70px]">T (cm)</TableHead>
                              <TableHead className="min-w-[70px]">L (cm)</TableHead>
                              <TableHead className="min-w-[80px]">P (cm)</TableHead>
                              <TableHead className="min-w-[70px]">PCS</TableHead>
                              <TableHead className="min-w-[120px]">Kategori</TableHead>
                              <TableHead className="min-w-[90px]">M&sup3; (Auto)</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tallyLines.map((line, idx) => {
                            const vol = (Number(line.t || 0) * Number(line.l || 0) * Number(line.p || 0) * Number(line.pcs || 0)) / 1000000
                            return (
                              <TableRow key={idx}>
                                <TableCell className="p-2"><Input type="number" placeholder="5" value={line.t} onChange={e => { const n = [...tallyLines]; n[idx].t = e.target.value; setTallyLines(n) }} /></TableCell>
                                <TableCell className="p-2"><Input type="number" placeholder="10" value={line.l} onChange={e => { const n = [...tallyLines]; n[idx].l = e.target.value; setTallyLines(n) }} /></TableCell>
                                <TableCell className="p-2"><Input type="number" placeholder="400" value={line.p} onChange={e => { const n = [...tallyLines]; n[idx].p = e.target.value; setTallyLines(n) }} /></TableCell>
                                <TableCell className="p-2"><Input type="number" placeholder="15" value={line.pcs} onChange={e => { const n = [...tallyLines]; n[idx].pcs = e.target.value; setTallyLines(n) }} /></TableCell>
                                <TableCell className="p-2">
                                  <select 
                                    className="h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold focus:outline-none"
                                    value={line.productType || "BALOK"} 
                                    onChange={e => { const n = [...tallyLines]; n[idx].productType = e.target.value; setTallyLines(n); }}
                                  >
                                    <option value="BALOK">Balok (Main)</option>
                                    <option value="RENG">Reng / Papan</option>
                                    <option value="AFKIR_BS">BS / Afkir</option>
                                    <option value="AIR_DRY">Air Dry</option>
                                    <option value="FJL">FJL / Jasa</option>
                                  </select>
                                </TableCell>
                                <TableCell className="p-2 font-mono font-semibold text-emerald-600">{vol.toFixed(4)}</TableCell>
                                <TableCell className="p-2">
                                  <Button variant="ghost" size="icon" onClick={() => setTallyLines(tallyLines.filter((_, i) => i !== idx))} disabled={tallyLines.length === 1}>
                                    <X className="w-4 h-4 text-rose-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      <div className="p-2 bg-muted/30 border-t">
                        <Button variant="ghost" size="sm" onClick={() => setTallyLines([...tallyLines, { t: "", l: "", p: "", pcs: "", productType: "BALOK" }])} className="w-full border border-dashed">
                          <Plus className="w-4 h-4 mr-2" /> Tambah Ukuran Lain
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTallyOpen(false)}>Batal</Button>
                    <Button onClick={handleSaveTally} disabled={savingTally}>
                      {savingTally ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} Simpan Tally (POST)
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="h-10 text-xs">TANGGAL</TableHead>
                      <TableHead className="h-10 text-xs">UKURAN (cm)</TableHead>
                      <TableHead className="h-10 text-xs">KATEGORI</TableHead>
                      <TableHead className="h-10 text-xs text-right">PCS</TableHead>
                      <TableHead className="h-10 text-xs text-right text-emerald-600">VOL (m&sup3;)</TableHead>
                      <TableHead className="h-10 text-xs text-center w-[120px]">STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.sawnOutputs || []).flatMap((o: any) => (o.items || []).map((item: any) => ({ ...item, parentDate: o.outputDate, status: o.status }))).map((i: any, idx: number) => {
                      return (
                        <TableRow key={i.id || idx} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{i.parentDate ? new Date(i.parentDate).toLocaleDateString("id-ID") : "-"}</TableCell>
                          <TableCell className="text-sm">{i.thicknessMm / 10} &times; {i.widthMm / 10} &times; {i.lengthMm / 10}</TableCell>
                          <TableCell className="text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                              i.productType === 'RENG' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                              i.productType === 'AFKIR_BS' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                              i.productType === 'AIR_DRY' ? 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20' :
                              'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            }`}>
                              {i.productType || 'BALOK'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">{i.quantityPcs}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{i.volumeM3.toFixed(4)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={i.status === 'POSTED' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>{i.status}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {(!data.sawnOutputs || data.sawnOutputs.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada history tally.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
