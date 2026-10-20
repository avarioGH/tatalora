"use client"
import { useState, useEffect, useRef } from "react"
import { TimberAPI, InventoryAPI, MasterDataAPI, PartaiAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, Plus, Trash2, Calculator } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function MassCreateRawLogPage() {
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const partaiIdFromUrl = searchParams.get('partaiId') || ''
  
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [speciesList, setSpeciesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lengthUnit, setLengthUnit] = useState<'m' | 'cm' | 'mm'>('m')

  useEffect(() => {
    const saved = localStorage.getItem('erp_length_unit_pref')
    if (saved === 'm' || saved === 'cm' || saved === 'mm') {
      setLengthUnit(saved)
    }
  }, [])

  const handleUnitChange = (unit: 'm' | 'cm' | 'mm') => {
    setLengthUnit(unit)
    localStorage.setItem('erp_length_unit_pref', unit)
  }

  const [masterForm, setMasterForm] = useState({
    speciesId: "",
    species: "",
    batch: partaiIdFromUrl,
    locationId: "",
    receivingDate: new Date().toISOString().substring(0,10),
  })

  // State for mass entry rows
  const [rows, setRows] = useState<any[]>([
    { id: Date.now().toString(), logNumber: "", length: "", d1: "", d2: "", d3: "", d4: "", gerowong: "" }
  ])

  // Ref for table to handle keyboard navigation
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (partaiIdFromUrl) {
      PartaiAPI.getPartai(partaiIdFromUrl).then((partai: any) => {
        if (partai && partai.purchases) {
          // Find all purchaseLogItems that are NOT received yet
          const pendingItems: any[] = [];
          let foundSpeciesId = "";
          let foundSpeciesName = "";
          partai.purchases.forEach((p: any) => {
             if (p.logItems) {
               p.logItems.forEach((li: any) => {
                 if (li.status !== 'RECEIVED' && p.status === 'CONFIRMED') {
                    pendingItems.push({
                       id: Date.now().toString() + Math.random(),
                       purchaseLogItemId: li.id,
                       logNumber: li.logNumber || "",
                       length: li.length || "",
                       d1: li.diameter1 || "",
                       d2: li.diameter2 || "",
                       d3: li.diameter3 || "",
                       d4: li.diameter4 || "",
                       gerowong: ""
                    });
                    if (!foundSpeciesName && li.species) {
                        foundSpeciesName = li.species;
                    }
                 }
               });
             }
          });
          
          if (pendingItems.length > 0) {
             setRows(pendingItems);
             
             // Try to match species in speciesList if already loaded
             let sId = "";
             if (speciesList.length > 0 && foundSpeciesName) {
                 const match = speciesList.find(s => s.code === foundSpeciesName || s.name === foundSpeciesName);
                 if (match) sId = match.id;
             }
             
             setMasterForm(prev => ({ 
                 ...prev, 
                 batch: partai.code || partai.id || partaiIdFromUrl,
                 species: foundSpeciesName || prev.species,
                 speciesId: sId || prev.speciesId
             }));
          }
        }
      }).catch(console.error);
    }
  }, [partaiIdFromUrl, speciesList]);


  useEffect(() => {
    Promise.all([
      InventoryAPI.getWarehouses(),
      MasterDataAPI.getSpecies()
    ])
      .then(([wRes, sRes]: any) => {
        setWarehouses(Array.isArray(wRes) ? wRes : [])
        setSpeciesList(Array.isArray(sRes) ? sRes : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleRowChange = (index: number, field: string, value: string) => {
    const newRows = [...rows]
    newRows[index][field] = value
    setRows(newRows)
  }

  const addRow = () => {
    setRows([...rows, { id: Date.now().toString() + Math.random(), logNumber: "", length: "", d1: "", d2: "", d3: "", d4: "", gerowong: "", avgDia: "" }])
  }

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    const newRows = (Array.isArray(rows) ? rows : []).filter((_, i) => i !== index)
    setRows(newRows)
  }

  // Handle Tab and Enter keys for grid navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If it's the last row, add a new one
      if (rowIndex === rows.length - 1) {
        addRow();
        setTimeout(() => focusCell(rowIndex + 1, 0), 50);
      } else {
        focusCell(rowIndex + 1, colIndex);
      }
    }
  }

  const focusCell = (rowIndex: number, colIndex: number) => {
    if (!tableRef.current) return;
    const rows = tableRef.current.querySelectorAll('tbody tr');
    if (rows[rowIndex]) {
      const inputs = rows[rowIndex].querySelectorAll('input');
      if (inputs[colIndex]) {
        inputs[colIndex].focus();
      }
    }
  }

  // Live Calculations
  const calculateRow = (row: any) => {
      let lRaw = parseFloat(row.length) || 0
      let l = lRaw
      if (lengthUnit === 'cm') l = lRaw / 100
      if (lengthUnit === 'mm') l = lRaw / 1000
      const d1 = parseFloat(row.d1) || 0
      const d2 = parseFloat(row.d2) || 0
      const d3 = parseFloat(row.d3) || 0
      const d4 = parseFloat(row.d4) || 0
      const manualAvg = parseFloat(row.avgDia) || 0
      const g = parseFloat(row.gerowong) || 0

      let avgDiaStrict = 0
      if (d1 > 0 || d2 > 0 || d3 > 0 || d4 > 0) {
        avgDiaStrict = (d1 + d2 + d3 + d4) / 4
      } else {
        avgDiaStrict = manualAvg
      }

      const rndDia = Math.round(avgDiaStrict)
      
      const grossVol = l > 0 && rndDia > 0 ? (Math.pow(rndDia, 2) * l * 0.7854) / 10000 : 0
      const gerowongVol = l > 0 && g > 0 ? (Math.pow(g, 2) * l * 0.7854) / 10000 : 0
      const netVol = grossVol - gerowongVol

      return {
        avg: avgDiaStrict,
        gross: grossVol,
        hollow: gerowongVol,
        net: netVol > 0 ? netVol : 0
      }
    }

  const handleSubmit = async () => {
    if (!masterForm.locationId) {
      return toast({ title: "Validasi Gagal", description: "Warehouse harus dipilih", variant: "destructive" })
    }
    if (!masterForm.batch) {
      return toast({ title: "Validasi Gagal", description: "Partai harus diisi", variant: "destructive" })
    }
    if (!masterForm.speciesId) {
      return toast({ title: "Validasi Gagal", description: "Species harus dipilih", variant: "destructive" })
    }

    // Filter out completely empty rows
    const validRows = (Array.isArray(rows) ? rows : []).filter(r => r.logNumber && r.length && (r.d1 || r.avgDia))
    
    if (validRows.length === 0) {
      return toast({ title: "Validasi Gagal", description: "Minimal isi 1 baris log dengan lengkap (Log No, Length, D1 atau ÃƒÆ’Ã‹Å“ Avg)", variant: "destructive" })
    }

    setSubmitting(true)
    try {
      const payloadItems = validRows.map(r => ({
        purchaseLogItemId: r.purchaseLogItemId || undefined,
        logNumber: r.logNumber,
        species: masterForm.species,
        speciesId: masterForm.speciesId,
        batch: masterForm.batch,
        locationId: masterForm.locationId,
        receivingDate: masterForm.receivingDate,
        originalLength: lengthUnit === 'cm' ? (parseFloat(r.length) / 100) : lengthUnit === 'mm' ? (parseFloat(r.length) / 1000) : parseFloat(r.length),
        diameter1: parseFloat(r.d1) || parseFloat(r.avgDia) || 0,
        diameter2: parseFloat(r.d2) || parseFloat(r.avgDia) || 0,
        diameter3: parseFloat(r.d3) || parseFloat(r.avgDia) || 0,
        diameter4: parseFloat(r.d4) || parseFloat(r.avgDia) || 0,
        gerowong: parseFloat(r.gerowong) || 0,
      }))

      await TimberAPI.createBulkLogs({ items: payloadItems })
      toast({ title: "Berhasil", description: `${payloadItems.length} Logs berhasil disimpan.` })
      router.push('/inventory/logs')
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Gagal menyimpan data massal.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

  const totalNet = rows.reduce((acc, row) => acc + calculateRow(row).net, 0)

  return (
    <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/inventory/logs')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Mass Entry: Register Raw Logs</h1>
          <p className="text-muted-foreground mt-1">Input massal data kayu log berdasarkan Partai & Spesies.</p>
        </div>
      </div>

      <Card className="bg-card rounded-xl border border-border shadow-sm">
        <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
          <CardTitle className="text-base font-bold">1. Master Data (Berlaku untuk semua baris)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Partai *</label>
            <Input placeholder="Contoh: BATCH-001" value={masterForm.batch} onChange={e => setMasterForm({...masterForm, batch: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Species *</label>
            <Select 
              value={masterForm.speciesId} 
              onValueChange={v => {
                const selected = speciesList.find(s => s.id === v)
                setMasterForm({...masterForm, speciesId: v || '', species: selected?.name || ''})
              }}
            >
              <SelectTrigger>
                {masterForm.speciesId ? speciesList.find(s => s.id === masterForm.speciesId)?.name : <SelectValue placeholder="Pilih Species..."/>}
              </SelectTrigger>
              <SelectContent>
                {speciesList.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Warehouse *</label>
            <Select value={masterForm.locationId} onValueChange={v => setMasterForm({...masterForm, locationId: v || ''})}>
              <SelectTrigger>
                {masterForm.locationId ? warehouses.find(w => w.id === masterForm.locationId)?.name : <SelectValue placeholder="Pilih Warehouse..."/>}
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Receiving Date *</label>
            <Input type="date" value={masterForm.receivingDate} onChange={e => setMasterForm({...masterForm, receivingDate: e.target.value})} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card rounded-xl border border-border shadow-sm">
        <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold">2. Log Input Data</CardTitle>
            <CardDescription className="mt-1">Gunakan tombol TAB untuk pindah kolom, dan ENTER untuk baris baru.</CardDescription>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground mr-2">Total Net M&sup3;:</span>
            <span className="text-xl font-bold text-primary">{totalNet.toFixed(4)}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 p-0 overflow-x-auto">
          <table className="min-w-full text-sm" ref={tableRef}>
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[50px]">#</th>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[150px]">Log No</th>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[120px]">
                  <div className="flex items-center gap-1">
                    Length
                    <select
                      className="bg-transparent border border-muted-foreground/30 rounded text-xs p-0.5 outline-none cursor-pointer text-foreground"
                      value={lengthUnit}
                      onChange={(e) => handleUnitChange(e.target.value as any)}
                    >
                      <option value="m">(m)</option>
                      <option value="cm">(cm)</option>
                      <option value="mm">(mm)</option>
                    </select>
                  </div>
                </th>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[80px]">D1 (cm)</th>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[80px]">D2 (cm)</th>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[80px]">D3 (cm)</th>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[80px]">D4 (cm)</th>
                <th className="p-3 text-left font-semibold text-muted-foreground font-semibold w-[100px]">Gerowong</th>
                <th className="p-3 text-right font-semibold text-muted-foreground font-semibold bg-muted/50 w-[100px]">&Oslash; Avg</th>
                <th className="p-3 text-right font-semibold text-muted-foreground font-semibold bg-muted/50">Gross</th>
                <th className="p-3 text-right font-semibold text-muted-foreground font-semibold bg-muted/50">Net M&sup3;</th>
                <th className="p-3 text-center font-semibold text-muted-foreground font-semibold w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const calc = calculateRow(row)
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-2 px-3 text-center text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="p-2 px-3"><Input className="h-8 rounded-sm bg-background" value={row.logNumber} readOnly={!!row.purchaseLogItemId} onChange={e => handleRowChange(idx, 'logNumber', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 0)} /></td>
                    <td className="p-2 px-3"><Input type="number" step="0.1" className="h-8 rounded-sm bg-background" value={row.length} onChange={e => handleRowChange(idx, 'length', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 1)} /></td>
                    <td className="p-2 px-3"><Input type="number" className="h-8 rounded-sm bg-background" value={row.d1} onChange={e => handleRowChange(idx, 'd1', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 2)} /></td>
                    <td className="p-2 px-3"><Input type="number" className="h-8 rounded-sm bg-background" value={row.d2} onChange={e => handleRowChange(idx, 'd2', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 3)} /></td>
                    <td className="p-2 px-3"><Input type="number" className="h-8 rounded-sm bg-background" value={row.d3} onChange={e => handleRowChange(idx, 'd3', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 4)} /></td>
                    <td className="p-2 px-3"><Input type="number" className="h-8 rounded-sm bg-background" value={row.d4} onChange={e => handleRowChange(idx, 'd4', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 5)} /></td>
                    <td className="p-2 px-3"><Input type="number" className="h-8 rounded-sm bg-background" value={row.gerowong} onChange={e => handleRowChange(idx, 'gerowong', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 6)} /></td>
                    
                    <td className="p-2 px-3"><Input type="number" step="0.1" className="h-8 rounded-sm bg-muted/30 text-right font-bold text-foreground" value={row.avgDia !== undefined && row.avgDia !== "" ? row.avgDia : (calc.avg > 0 ? calc.avg.toFixed(1) : "")} onChange={e => handleRowChange(idx, "avgDia", e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 7)} placeholder={calc.avg > 0 ? calc.avg.toFixed(1) : ""} /></td>
                    <td className="p-2 px-3 text-right font-medium text-muted-foreground bg-muted/10">{calc.gross.toFixed(3)}</td>
                    <td className="p-2 px-3 text-right font-bold text-primary bg-muted/10">{calc.net.toFixed(3)}</td>
                    <td className="p-2 px-3 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-50 hover:opacity-100" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 border-t bg-muted/5">
            <Button variant="outline" onClick={addRow} className="w-full border-dashed bg-background">
              <Plus className="w-4 h-4 mr-2" /> Tambah Baris (Enter)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 md:gap-4 mt-8">
        <Button variant="outline" className="w-full sm:w-32" onClick={() => router.push('/inventory/logs')}>Batal</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-48 shadow-sm font-semibold">
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Semua Data
        </Button>
      </div>
    </div>
  )
}
