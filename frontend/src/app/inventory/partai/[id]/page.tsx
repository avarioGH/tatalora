"use client";
import React, { useEffect, useState } from "react";
import { api, PartaiAPI, TimberAPI, PurchaseAPI, MasterDataAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Plus, Eye, Edit, Trash2, Scissors, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function PartaiDetailPage({ params }: { params: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = React.use(params as Promise<{ id: string }>);
const [partai, setPartai] = useState<any>(null);
  
  // -- Inline DUKB state --
  const [inlineDukbRows, setInlineDukbRows] = useState<any[]>([]);
  const [isSavingDukb, setIsSavingDukb] = useState(false);
  const [lengthUnit, setLengthUnit] = useState<'m' | 'cm' | 'mm'>('m');
  const [grades, setGrades] = useState<any[]>([]);
  const [selectedOutputItems, setSelectedOutputItems] = useState<{id: string, outputId: string}[]>([]);
  const [isGrading, setIsGrading] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  
  useEffect(() => {
    MasterDataAPI.getGrades().then((res: any) => setGrades(res.data || res)).catch(() => {});
  }, []);
  
  const handleBulkGrade = async () => {
    if (!selectedGradeId) {
       toast({ title: "Pilih Grade", description: "Silakan pilih grade terlebih dahulu", variant: "destructive" });
       return;
    }
    const gradeObj = grades.find(g => g.id === selectedGradeId);
    setIsGrading(true);
    let success = 0;
    for (const item of selectedOutputItems) {
       try {
         await api.patch(`/inventory/sawn-timber/output/${item.outputId}/items/${item.id}/grade`, {
           gradeId: gradeObj.id,
           grade: gradeObj.code || gradeObj.name || 'STANDARD',
         });
         success++;
       } catch (e: any) {
         console.error(e);
         const msg = e?.response?.data?.error?.message || e?.response?.data?.message || 'Gagal update grade';
         toast({ title: 'Gagal', description: msg, variant: 'destructive' });
       }
    }
    setIsGrading(false);
    if (success > 0) {
      toast({ title: "Selesai", description: `Berhasil mengupdate ${success} item.` });
    }
    setSelectedOutputItems([]);
    fetchPartai();
  };

  const [isPostingOutputs, setIsPostingOutputs] = useState(false);
  const handlePostOutputs = async () => {
    const draftOutputs = (partai?.sawnOutputs || []).filter((o: any) => o.status === 'DRAFT');
    const outputsToPost = selectedOutputItems.length > 0
      ? Array.from(new Set(selectedOutputItems.map(i => i.outputId))).filter(oid => {
          const out = (partai?.sawnOutputs || []).find((o: any) => o.id === oid);
          return out?.status === 'DRAFT';
        })
      : draftOutputs.map((o: any) => o.id);

    if (outputsToPost.length === 0) {
      toast({ title: "Info", description: "Tidak ada output berstatus DRAFT untuk di-posting ke stok." });
      return;
    }

    setIsPostingOutputs(true);
    let success = 0;
    for (const outputId of outputsToPost) {
      try {
        await api.post(`/inventory/sawn-timber/output/${outputId}/post`);
        success++;
      } catch (err: any) {
        console.error(err);
        const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Gagal posting output';
        toast({ title: 'Gagal', description: msg, variant: 'destructive' });
      }
    }
    setIsPostingOutputs(false);
    if (success > 0) {
      toast({ title: "Berhasil", description: `${success} output berhasil di-posting ke Stok!` });
    }
    setSelectedOutputItems([]);
    fetchPartai();
  };
  
  const toggleSelectOutputItem = (id: string, outputId: string) => {
    const exists = selectedOutputItems.find(x => x.id === id);
    if (exists) {
      setSelectedOutputItems(selectedOutputItems.filter(x => x.id !== id));
    } else {
      setSelectedOutputItems([...selectedOutputItems, {id, outputId}]);
    }
  };
  
  const toggleSelectAllOutputItems = (allItems: any[]) => {
    if (selectedOutputItems.length === allItems.length) {
       setSelectedOutputItems([]);
    } else {
       setSelectedOutputItems(allItems.map(i => ({ id: i.id, outputId: i.parentOutputId })));
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('erp_length_unit_pref');
    if (saved === 'm' || saved === 'cm' || saved === 'mm') {
      setLengthUnit(saved);
    }
  }, []);

  const handleUnitChange = (unit: 'm' | 'cm' | 'mm') => {
    setLengthUnit(unit);
    localStorage.setItem('erp_length_unit_pref', unit);
  };



  useEffect(() => {
    if (partai && partai.purchases) {
      const pending: any[] = [];
      partai.purchases.forEach((p: any) => {
        if (p.logItems && p.status === 'CONFIRMED') {
          p.logItems.forEach((li: any) => {
            if (li.status !== 'RECEIVED') {
              pending.push({
                purchaseLogItemId: li.id,
                logNumber: li.logNumber || "",
                species: li.species || "",
                length: li.length || "",
                d1: li.diameter1 || "",
                d2: li.diameter2 || "",
                d3: li.diameter3 || "",
                d4: li.diameter4 || "",
                gerowong: "",
                locationId: p.warehouseId || partai.company_id
              });
            }
          });
        }
      });
      setInlineDukbRows(pending);
    }
  }, [partai]);

  const handleInlineDukbChange = (index: number, field: string, value: string) => {
    const newRows = [...inlineDukbRows];
    newRows[index][field] = value;
    setInlineDukbRows(newRows);
  };


  const calculateRow = (row: any) => {
    let lRaw = parseFloat(row.length) || 0;
    let l = lRaw;
    if (lengthUnit === 'cm') l = lRaw / 100;
    if (lengthUnit === 'mm') l = lRaw / 1000;

    const d1 = parseFloat(row.d1) || 0;
    const d2 = parseFloat(row.d2) || 0;
    const d3 = parseFloat(row.d3) || 0;
    const d4 = parseFloat(row.d4) || 0;
    const manualAvg = parseFloat(row.avgDia) || 0;
    const g = parseFloat(row.gerowong) || 0;

    let avgDiaStrict = 0;
    if (d1 > 0 || d2 > 0 || d3 > 0 || d4 > 0) {
      avgDiaStrict = (d1 + d2 + d3 + d4) / 4;
    } else {
      avgDiaStrict = manualAvg;
    }
    const rndDia = Math.round(avgDiaStrict);
    
    const grossVol = l > 0 && rndDia > 0 ? (Math.pow(rndDia, 2) * l * 0.7854) / 10000 : 0;
    const gerowongVol = l > 0 && g > 0 ? (Math.pow(g, 2) * l * 0.7854) / 10000 : 0;
    const netVol = grossVol - gerowongVol;

    return {
      meterLength: l,
      avg: avgDiaStrict,
      gross: grossVol,
      net: netVol < 0 ? 0 : netVol
    }
  };

  const handleSaveInlineDukb = async () => {

    const toSave = inlineDukbRows.filter(r => r.length && (r.avgDia || (r.d1 && r.d2 && r.d3 && r.d4)));
    if (toSave.length === 0) {
      toast({ title: "Tidak ada data lengkap", description: "Isi dimensi minimal pada satu log (Panjang, serta D1-D4 atau Rata-rata) untuk menyimpannya.", variant: "destructive" });
      return;
    }
    setIsSavingDukb(true);
    try {
      const payload = toSave.map(r => {
        const calc = calculateRow(r);
        return {
        purchaseLogItemId: r.purchaseLogItemId,
        logNumber: r.logNumber,
        species: r.species,
        originalLength: calc.meterLength,
        diameter1: Number(r.d1) || 0,
        diameter2: Number(r.d2) || 0,
        diameter3: Number(r.d3) || 0,
        diameter4: Number(r.d4) || 0,
        averageDiameter: Number(r.avgDia) || 0,
        gerowong: Number(r.gerowong) || 0,
        partaiId: partai.id,
        locationId: r.locationId,
        date: new Date().toISOString()
        };
      });
      await TimberAPI.createBulkLogs({ items: payload });
      toast({ title: "Berhasil", description: `${payload.length} log berhasil diterima (DUKB dibuat)!` });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Gagal menyimpan DUKB", variant: "destructive" });
    } finally {
      setIsSavingDukb(true);
      setTimeout(() => setIsSavingDukb(false), 500); 
    }
  };

  const fetchPartai = () => {
    if (id) {
      PartaiAPI.getPartai(id).then((res: any) => {
        setPartai(res);
      }).catch(console.error);
    }
  };

  useEffect(() => {
    fetchPartai();
  }, [id]);

  
  
  const handleReceivePurchase = async (purchaseId: string) => {
    try {
      await PurchaseAPI.receivePurchase(purchaseId);
      toast({ title: "Success", description: "Purchase marked as Received. Logs have been added to DUKB." });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Failed to receive", variant: "destructive" });
    }
  };

  const handleConfirmPurchase = async (purchaseId: string) => {
    try {
      await PurchaseAPI.confirmPurchase(purchaseId);
      toast({ title: "Success", description: "Purchase confirmed." });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Failed to confirm", variant: "destructive" });
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm("Are you sure you want to delete this purchase?")) return;
    try {
      await PurchaseAPI.deletePurchase(purchaseId);
      toast({ title: "Success", description: "Purchase deleted." });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Delete failed", variant: "destructive" });
    }
  };

      const handleDirectTrim = async (log: any) => {
    if (!confirm(`Buat hasil trimming penuh (100% full) untuk log ${log.logNumber} tanpa pemotongan?`)) return;
    try {
      await api.post(`/inventory/logs/${log.id}/trimming`, {
        length: log.originalLength,
        diameter1: log.diameter1 || 0,
        diameter2: log.diameter2 || 0,
        diameter3: log.diameter3 || 0,
        diameter4: log.diameter4 || 0,
        averageDiameter: log.averageDiameter || 0,
        gerowong: log.gerowong || 0,
        trimmingLength: 0
      });
      toast({ title: "Success", description: "Log berhasil di-trim penuh." });
      fetchPartai();
    } catch (e: any) {
      console.error(e);
      const rawData = e?.response?.data;
      const msg = rawData?.error?.message || rawData?.message || e.message;
      toast({ title: "Gagal Trimming", description: msg, variant: "destructive" });
      alert("Gagal Trimming: " + msg);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    try {
      await TimberAPI.deleteLog(logId);
      toast({ title: "Success", description: "Log deleted." });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Delete failed", variant: "destructive" });
    }
  };

  const handleDeleteTrim = async (trimId: string) => {
    if (!confirm("Are you sure you want to delete this trim record?")) return;
    try {
      await TimberAPI.deleteTrimmingLog(trimId);
      toast({ title: "Success", description: "Trim deleted." });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Delete failed", variant: "destructive" });
    }
  };

  const handleDeleteInput = async (inputId: string) => {
    if (!confirm("Are you sure you want to delete this input log?")) return;
    try {
      await TimberAPI.deleteInputLog(inputId);
      toast({ title: "Success", description: "Input log deleted." });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Delete failed", variant: "destructive" });
    }
  };

  const handleDeleteOutput = async (outputId: string) => {
    if (!confirm("Are you sure you want to delete this output?")) return;
    try {
      await TimberAPI.cancelSawnOutput(outputId);
      toast({ title: "Success", description: "Output deleted/cancelled." });
      fetchPartai();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.message || "Delete failed", variant: "destructive" });
    }
  };

  if (!partai) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/inventory/partai')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detail Partai: {partai.code}</h1>
            <p className="text-sm text-muted-foreground">{partai.name || "Tanpa Nama"}</p>
          </div>
        </div>
        <Badge variant={partai.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {partai.status}
        </Badge>
      </div>

      <Tabs defaultValue="purchase" className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-12 mb-6">
          <TabsTrigger value="purchase">1. Purchase</TabsTrigger>
          <TabsTrigger value="rawlogs">2. DUKB (Raw Logs)</TabsTrigger>
          <TabsTrigger value="trimming">3. Trimming</TabsTrigger>
          <TabsTrigger value="input">4. Input (WIP)</TabsTrigger>
          <TabsTrigger value="output">5. Output (Sawn Timber)</TabsTrigger>
          <TabsTrigger value="summary">6. Rekapan</TabsTrigger>
        </TabsList>

        {/* 1. PURCHASE LOGS */}
        <TabsContent value="purchase">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Purchase Log / Sawn Timber</CardTitle>
                <CardDescription>Data pembelian awal bahan baku yang masuk ke partai ini.</CardDescription>
              </div>
              <Button onClick={() => router.push(`/inventory/purchase/create?partaiId=${id}`)}>
                <Plus className="w-4 h-4 mr-2" /> Add Purchase
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pembelian</TableHead>
                      <TableHead>Nama Log</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Item</TableHead>
                    <TableHead>Total Volume (m³)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(partai.purchases || []).map((p: any) => (
                    <TableRow key={p.id} className="group hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/inventory/purchase/${p.id}`)}>
                      <TableCell className="font-medium">{p.purchaseNumber || p.code}</TableCell>
                        <TableCell>
                          {(() => {
                            if (p.logItems && p.logItems.length > 0) {
                              const species = Array.from(new Set(p.logItems.map((l: any) => l.species).filter(Boolean)));
                              if (species.length > 0) return species.join(', ');
                              return "Raw Logs";
                            }
                            if (p.items && p.items.length > 0) return "Sawn Timber";
                            return "-";
                          })()}
                        </TableCell>
                      <TableCell>{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString("id-ID") : "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={p.status === 'CONFIRMED' ? 'text-emerald-500 border-emerald-500 bg-emerald-500/10' : 'text-muted-foreground'}>{p.status || "DRAFT"}</Badge></TableCell>
                      <TableCell>{(p.items?.length || 0) + (p.logItems?.length || 0)}</TableCell>
                      <TableCell>{p.totalVolumeM3 || 0}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 ">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/purchase/${p.id}`) }}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Edit" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/purchase/${p.id}/edit`) }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeletePurchase(p.id) }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!partai.purchases || partai.purchases.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada pembelian untuk partai ini.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. DUKB (RAW LOGS) */}
                {/* 2. DUKB (RAW LOGS) */}
        <TabsContent value="rawlogs">
          {inlineDukbRows.length > 0 && (
            <Card className="mb-6 border-blue-500/20 shadow-sm bg-blue-50/30 dark:bg-blue-900/20">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-blue-600 dark:text-blue-400">Penerimaan Log (Pending dari Purchase)</CardTitle>
                  <CardDescription>Isi dimensi pada log yang datang untuk otomatis membuat DUKB. Baris yang kosong akan diabaikan (bisa diisi nanti).</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Satuan Panjang:</span>
                  <select 
                    className="h-8 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-ring outline-none transition-colors"
                    value={lengthUnit} 
                    onChange={(e: any) => handleUnitChange(e.target.value)}
                  >
                    <option value="m">Meter (m)</option>
                    <option value="cm">Centimeter (cm)</option>
                    <option value="mm">Millimeter (mm)</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">No. Log</TableHead>
                        <TableHead className="w-[100px]">Spesies</TableHead>
                        <TableHead className="w-[70px]">P ({lengthUnit})</TableHead>
                        <TableHead className="w-[70px]">D1 (cm)</TableHead>
                        <TableHead className="w-[70px]">D2 (cm)</TableHead>
                        <TableHead className="w-[70px]">D3 (cm)</TableHead>
                        <TableHead className="w-[70px]">D4 (cm)</TableHead>
                        <TableHead className="w-[70px]">Grw (cm)</TableHead>
                        <TableHead className="w-[70px] text-right">Avg</TableHead>
                        <TableHead className="w-[80px] text-right">Gross</TableHead>
                        <TableHead className="w-[80px] text-right text-blue-500 font-bold">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inlineDukbRows.map((r, idx) => {
                        const calc = calculateRow(r);
                        return (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="p-1"><Input className="h-8 text-xs bg-muted/50 border-input cursor-not-allowed" value={r.logNumber} readOnly disabled/></TableCell>
                          <TableCell className="p-1"><Input className="h-8 text-xs bg-muted/50 border-input cursor-not-allowed" value={r.species} readOnly disabled/></TableCell>
                          <TableCell className="p-1"><Input type="number" step="0.1" className="h-8 text-sm" value={r.length} onChange={e => handleInlineDukbChange(idx, 'length', e.target.value)} /></TableCell>
                          <TableCell className="p-1"><Input type="number" className="h-8 text-sm" value={r.d1} onChange={e => handleInlineDukbChange(idx, 'd1', e.target.value)} /></TableCell>
                          <TableCell className="p-1"><Input type="number" className="h-8 text-sm" value={r.d2} onChange={e => handleInlineDukbChange(idx, 'd2', e.target.value)} /></TableCell>
                          <TableCell className="p-1"><Input type="number" className="h-8 text-sm" value={r.d3} onChange={e => handleInlineDukbChange(idx, 'd3', e.target.value)} /></TableCell>
                          <TableCell className="p-1"><Input type="number" className="h-8 text-sm" value={r.d4} onChange={e => handleInlineDukbChange(idx, 'd4', e.target.value)} /></TableCell>
                          <TableCell className="p-1"><Input type="number" className="h-8 text-sm" value={r.gerowong} onChange={e => handleInlineDukbChange(idx, 'gerowong', e.target.value)} /></TableCell>
                          <TableCell className="p-1 bg-muted/20 border-l"><Input type="number" step="0.1" className="h-8 text-sm text-right font-semibold bg-background" value={r.avgDia !== undefined && r.avgDia !== "" ? r.avgDia : (calc.avg > 0 ? calc.avg.toFixed(1) : "")} onChange={e => handleInlineDukbChange(idx, 'avgDia', e.target.value)} placeholder={calc.avg > 0 ? calc.avg.toFixed(1) : ""} /></TableCell>
                          <TableCell className="p-2 text-right bg-muted/20 text-muted-foreground text-sm font-medium">{calc.gross > 0 ? calc.gross.toFixed(3) : "-"}</TableCell>
                          <TableCell className="p-2 text-right bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-sm">{calc.net > 0 ? calc.net.toFixed(3) : "-"}</TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="text-sm">
                    Total Net Vol. (Live): <span className="font-bold text-lg text-blue-500">{inlineDukbRows.reduce((sum, r) => sum + calculateRow(r).net, 0).toFixed(4)} m3</span>
                  </div>
                  <Button onClick={handleSaveInlineDukb} disabled={isSavingDukb}>
                    {isSavingDukb ? "Menyimpan..." : "Simpan DUKB (Terima Parsial/Full)"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Data Ukur Kayu Bulat (DUKB)</CardTitle>
                <CardDescription>Daftar log mentah yang terdaftar dalam partai ini.</CardDescription>
              </div>
              
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Log</TableHead>
                    <TableHead>Spesies</TableHead>
                    <TableHead className="text-right">Panjang (m)</TableHead>
                    <TableHead className="text-right">Avg (cm)</TableHead>
                    <TableHead className="text-right">Grw (cm)</TableHead>
                    <TableHead className="text-right">Gross (m&sup3;)</TableHead>
                    <TableHead className="text-right">Net (m&sup3;)</TableHead>
                    <TableHead className="text-center w-[120px]">Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {(partai.rawLogs || []).map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-muted/50 cursor-pointer group" onClick={() => router.push(`/inventory/logs/${r.id}`)}>
                        <TableCell className="font-medium">{r.logNumber}</TableCell>
                        <TableCell>{r.species}</TableCell>
                        <TableCell className="text-right">{r.originalLength}</TableCell>
                        <TableCell className="text-right">{Number(r.averageDiameter || 0).toFixed(1)}</TableCell>
                        <TableCell className="text-right">{r.gerowong ? Number(r.gerowong).toFixed(1) : "-"}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{Number(r.grossVolume || 0).toFixed(4)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{Number(r.netVolume || 0).toFixed(4)}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/logs/${r.id}`) }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Tanpa Trimming (Langsung Trim Penuh)" onClick={(e) => { e.stopPropagation(); handleDirectTrim(r) }}>
                              <Scissors className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Edit" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/logs/${r.id}/edit`) }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteLog(r.id) }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                  ))}
                  {(!partai.rawLogs || partai.rawLogs.length === 0) && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada raw log (DUKB) terdaftar.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. TRIMMING */}
        <TabsContent value="trimming">
          <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Trimming</CardTitle>
                  <CardDescription>Proses pemotongan log (pangkal/ujung) sebelum masuk sawmill.</CardDescription>
                </div>
              </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Trim</TableHead>
                    <TableHead>No. Log Asal</TableHead>
                    <TableHead className="text-right">Volume Hasil (m³)</TableHead>
                    <TableHead className="text-right">Sisa Gerowong</TableHead>
                    <TableHead className="text-center w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(partai.trimmedLogs || []).map((t: any) => (
                    <TableRow key={t.id} className="hover:bg-muted/60 cursor-pointer" onClick={() => router.push(`/inventory/trimming/${t.id}`)}>
                      <TableCell className="font-medium">{t.trimNumber || t.logNumber}</TableCell>
                      <TableCell className="text-primary font-medium">{t.rawLog?.logNumber || "-"}</TableCell>
                      <TableCell className="text-right font-bold text-foreground/90">{Number(t.netVolume || 0).toFixed(4)}</TableCell>
                      <TableCell className="text-right">{Number(t.hollowVolume || 0).toFixed(4)}</TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 border-0 bg-transparent">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/inventory/trimming/${t.id}`)}><Eye className="w-4 h-4 mr-2" /> View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/inventory/trimming/${t.id}/edit`)}><Pencil className="w-4 h-4 mr-2" /> Edit Log</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteTrim(t.id) }} className="text-destructive"><Trash className="w-4 h-4 mr-2" /> Delete Log</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!partai.trimmedLogs || partai.trimmedLogs.length === 0) && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada proses trimming.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. INPUT LOGS */}
        <TabsContent value="input">
          {/* AVAILABLE TRIMMED LOGS */}
          {partai.trimmedLogs?.filter((t: any) => t.status === 'AVAILABLE').length > 0 && (
            <Card className="mb-6 border-amber-500/20 bg-amber-50/30 dark:bg-amber-900/10">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-amber-700 dark:text-amber-500">Log Siap Masuk Mesin (Dari Trimming)</CardTitle>
                <CardDescription>Pilih log hasil trimming di bawah ini untuk memulai pekerjaan produksi (WIP) baru.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {partai.trimmedLogs.filter((t: any) => t.status === 'AVAILABLE').map((t: any) => (
                    <div key={t.id} className="flex flex-col border rounded-lg p-4 bg-background shadow-sm hover:border-amber-400 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-lg">{t.trimNumber}</span>
                        <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50 dark:bg-amber-900/20">SIAP POTONG</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        <p>Spesies: <span className="font-medium text-foreground">{t.species}</span></p>
                        <p>Dimensi: <span className="font-medium text-foreground">{t.roundedDiameter} cm x {t.length} m</span></p>
                        <p>Volume: <span className="font-medium text-foreground">{Number(t.netVolume || 0).toFixed(4)} m&sup3;</span></p>
                      </div>
                      <Button 
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white" 
                        onClick={async () => {
                          
                          try {
                            await TimberAPI.createInputLog({ trimmedLogIds: [t.id] });
                            toast({ title: "Berhasil", description: `WIP Job untuk log ${t.trimNumber} berhasil dibuat.` });
                            fetchPartai();
                          } catch (err: any) {
                            toast({ title: "Gagal", description: err.response?.data?.error?.message || err.response?.data?.message || err.message, variant: "destructive" });
                          }
                        }}
                      >
                        <ArrowRight className="w-4 h-4 mr-2" /> Mulai Gergaji (Buat WIP)
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>Production Jobs (Input WIP)</CardTitle>
                <CardDescription>Pekerjaan gergajian berjalan yang diambil dari DUKB/Trimmed Log.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {(partai.inputLogs || []).map((i: any) => {
                const totalInputVol = Number(i.totalVolume || 0);
                const outItems = (i.sawnOutputs || []).flatMap((o: any) => o.items || []);
                const totalOutputVol = outItems.reduce((acc: number, cur: any) => acc + (cur.volumeM3 || 0), 0);
                const progressPct = totalInputVol > 0 ? Math.min(100, Math.round((totalOutputVol / totalInputVol) * 100)) : 0;
                
                return (
                  <Card key={i.id} className="overflow-hidden border-border/60 hover:border-primary/40 transition-all cursor-pointer shadow-sm group" onClick={() => router.push(`/inventory/input-logs/${i.id}`)}>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-primary group-hover:underline">{i.inputNumber}</span>
                          {i.status === 'DONE' ? <Badge className="bg-emerald-500 hover:bg-emerald-600">DONE</Badge> : i.status === 'IN_PROCESS' ? <Badge className="bg-amber-500 hover:bg-amber-600">IN PROCESS</Badge> : <Badge className="bg-rose-500 hover:bg-rose-600">AVAILABLE</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-1 items-center">
                          <span className="font-medium text-foreground/80">{i.species}</span> &bull; {i.items?.length || 0} Source Logs
                        </div>
                      </div>
                      
                      <div className="md:col-span-7 grid grid-cols-3 gap-4 text-sm text-center">
                        <div className="bg-muted/30 rounded-md p-2">
                          <div className="text-xs text-muted-foreground mb-1">Input (m&sup3;)</div>
                          <div className="font-semibold text-foreground/90">{totalInputVol.toFixed(4)}</div>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <div className="text-xs text-muted-foreground mb-1">Output (m&sup3;)</div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">{totalOutputVol.toFixed(4)}</div>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <div className="text-xs text-muted-foreground mb-1">Yield</div>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">{progressPct}%</div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2 flex justify-end">
                        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/input-logs/${i.id}`) }}>
                          Detail Pekerjaan <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                    {/* Progress Bar Visualizer */}
                    <div className="h-1.5 w-full bg-muted/50">
                      <div className={`h-full transition-all duration-500 ${i.status === 'DONE' ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                  </Card>
                );
              })}
              {(!partai.inputLogs || partai.inputLogs.length === 0) && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  Belum ada pekerjaan produksi (WIP). Lakukan Trimming pada log terlebih dahulu, lalu klik "Mulai Gergaji (Buat WIP)" di atas.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        
          {/* 5. SAWN TIMBER OUTPUT */}
          <TabsContent value="output">
            

          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>Sawn Timber Output (Daily Tally)</CardTitle>
                <CardDescription>Hasil akhir gergajian yang tercatat dari seluruh WIP partai ini.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center space-x-4 mb-4 bg-muted/30 p-3 rounded-lg border">
                <div className="text-sm font-medium">{selectedOutputItems.length} item terpilih</div>
                <Select value={selectedGradeId} onValueChange={(val) => setSelectedGradeId(val || "")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Pilih Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(g => (
                      <SelectItem key={g.id || g._id} value={g.id || g._id}>{g.name && g.code ? (g.code + " - " + g.name) : (g.name || g.code || ("Grade " + (g.id || g._id).toString().slice(-4)))}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBulkGrade} 
                  disabled={selectedOutputItems.length === 0 || !selectedGradeId || isGrading}
                >
                  {isGrading ? "Memproses..." : "Update Grade"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handlePostOutputs} 
                  disabled={isPostingOutputs || (partai?.sawnOutputs || []).filter((o: any) => o.status === 'DRAFT').length === 0}
                  className="ml-auto text-emerald-600 border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
                >
                  {isPostingOutputs ? "Memposting..." : "Post Output ke Stok"}
                </Button>
              </div>
              <Table>
                <TableHeader className="bg-muted/30">
                  
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Tgl Produksi</TableHead>
                      <TableHead>Bundle No</TableHead>
                      <TableHead>Source WIP</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Tebal</TableHead>
                      <TableHead>Lebar</TableHead>
                      <TableHead>Panjang</TableHead>
                      <TableHead className="text-right">PCS</TableHead>
                      <TableHead className="text-right">M&sup3;</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>

                </TableHeader>
                <TableBody>
                  {(() => {
  const allOutputItems = (partai.sawnOutputs || []).flatMap((o: any) => (o.items || []).map((item: any) => ({ ...item, parentDate: o.outputDate, parentInputId: o.inputLogId, parentBundleNumber: o.bundleNumber, parentOutputId: o.id, parentStatus: o.status })));
  return allOutputItems.map((i: any) => {
                    const wip = (partai.inputLogs || []).find((log: any) => log.id === i.parentInputId);
                    return (
                      
                        <TableRow key={i.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/inventory/sawn-timber/output/${i.parentOutputId}`)}>
                          <TableCell onClick={e => e.stopPropagation()}>
     <Checkbox 
       checked={!!selectedOutputItems.find(x => x.id === i.id)} 
       onCheckedChange={() => toggleSelectOutputItem(i.id, i.parentOutputId)} 
     />
   </TableCell>
                            <TableCell>{i.parentDate ? new Date(i.parentDate).toLocaleDateString("id-ID") : "-"}</TableCell>
                          <TableCell className="font-medium text-blue-600 dark:text-blue-400">{i.parentBundleNumber}</TableCell>
                          <TableCell className="font-medium text-primary"><Link href={`/inventory/input-logs/${i.parentInputId}`} onClick={e => e.stopPropagation()}>{wip?.inputNumber || "WIP"}</Link></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              i.productType === 'RENG' ? 'border-amber-500 text-amber-600 bg-amber-50/50' :
                              i.productType === 'AFKIR_BS' ? 'border-red-500 text-red-600 bg-red-50/50' :
                              i.productType === 'AIR_DRY' ? 'border-sky-500 text-sky-600 bg-sky-50/50' :
                              i.productType === 'FJL' ? 'border-purple-500 text-purple-600 bg-purple-50/50' :
                              'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                            }>
                              {i.productType === 'BALOK' ? 'Balok / Main' :
                               i.productType === 'RENG' ? 'Reng / Papan' :
                               i.productType === 'AFKIR_BS' ? 'BS / Afkir' :
                               i.productType === 'AIR_DRY' ? 'Air Dry' :
                               i.productType === 'FJL' ? 'FJL' : (i.productType || 'Balok / Main')}
                            </Badge>
                          </TableCell>
                          <TableCell>{i.thicknessMm / 10} cm</TableCell>
                          <TableCell>{i.widthMm / 10} cm</TableCell>
                          <TableCell>{i.lengthMm / 10} cm</TableCell>
                          <TableCell className="text-right font-medium">{i.quantityPcs}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{Number(i.volumeM3.toFixed(4))}</TableCell>
                          <TableCell className="text-center">
                            {i.grade === 'PENDING' ? <Badge variant="outline" className="text-amber-500 border-amber-500">PENDING</Badge> : <Badge className="bg-primary">{grades.find(g => g.code === i.grade)?.name || i.grade}</Badge>}
                          </TableCell>
                          <TableCell className="text-center">
                            {i.parentStatus === 'POSTED' ? <Badge className="bg-emerald-500">POSTED</Badge> : <Badge variant="outline">DRAFT</Badge>}
                          </TableCell>
                        </TableRow>

                    );
                  });
                  })()}
                  {(!partai.sawnOutputs || partai.sawnOutputs.length === 0 || partai.sawnOutputs.flatMap((o: any) => o.items).length === 0) && (
                    <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">Belum ada output produksi.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

          {/* 6. REKAPAN */}
          <TabsContent value="summary">
            {(() => {
              // Raw Logs (DUKB)
              const rawLogs = partai.rawLogs || [];
              const totalRawLogPcs = rawLogs.length;
              const totalRawLogVolM3 = rawLogs.reduce((s: number, r: any) => {
                const d = (r.averageDiameter || r.diameter || 0) / 100;
                const l = r.length || 0;
                return s + (Math.PI / 4) * d * d * l;
              }, 0);

              // Trimming
              const trimmedLogs = partai.trimmedLogs || [];
              const totalTrimmedPcs = trimmedLogs.length;
              const totalTrimmedVolM3 = trimmedLogs.reduce((s: number, t: any) => {
                const d = (t.averageDiameter || t.diameter || 0) / 100;
                const l = t.length || 0;
                return s + (Math.PI / 4) * d * d * l;
              }, 0);

              // Input WIP
              const inputLogs = partai.inputLogs || [];
              const totalInputPcs = inputLogs.length;

              // Output Sawn Timber
              const allOutputItems = (partai.sawnOutputs || []).flatMap((o: any) => o.items || []);
              const totalOutputPcs = allOutputItems.reduce((s: number, i: any) => s + (i.quantityPcs || 0), 0);
              const totalOutputM3 = allOutputItems.reduce((s: number, i: any) => s + (i.volumeM3 || 0), 0);
              const postedItems = (partai.sawnOutputs || []).filter((o: any) => o.status === 'POSTED').flatMap((o: any) => o.items || []);
              const postedPcs = postedItems.reduce((s: number, i: any) => s + (i.quantityPcs || 0), 0);
              const postedM3 = postedItems.reduce((s: number, i: any) => s + (i.volumeM3 || 0), 0);

              // Rendemen
              const rendemen = totalRawLogVolM3 > 0 ? (totalOutputM3 / totalRawLogVolM3) * 100 : 0;

              // Product Category breakdown (Balok, Reng, BS, Air Dry, FJL)
              const CATEGORY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
                BALOK: { label: 'Balok / Main Size', badgeClass: 'border-emerald-500 text-emerald-600 bg-emerald-50/50' },
                RENG: { label: 'Reng / Papan', badgeClass: 'border-amber-500 text-amber-600 bg-amber-50/50' },
                AFKIR_BS: { label: 'BS / Afkir', badgeClass: 'border-red-500 text-red-600 bg-red-50/50' },
                AIR_DRY: { label: 'Air Dry', badgeClass: 'border-sky-500 text-sky-600 bg-sky-50/50' },
                FJL: { label: 'FJL', badgeClass: 'border-purple-500 text-purple-600 bg-purple-50/50' },
              };
              const categoryBreakdown: Record<string, { pcs: number; m3: number }> = {};
              allOutputItems.forEach((i: any) => {
                const cat = i.productType || 'BALOK';
                if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { pcs: 0, m3: 0 };
                categoryBreakdown[cat].pcs += i.quantityPcs || 0;
                categoryBreakdown[cat].m3 += i.volumeM3 || 0;
              });

              // Grade breakdown
              const gradeBreakdown: Record<string, { pcs: number; m3: number }> = {};
              allOutputItems.forEach((i: any) => {
                const gradeKey = i.grade || 'PENDING';
                const gradeName = grades.find((g: any) => g.code === gradeKey)?.name || gradeKey;
                if (!gradeBreakdown[gradeName]) gradeBreakdown[gradeName] = { pcs: 0, m3: 0 };
                gradeBreakdown[gradeName].pcs += i.quantityPcs || 0;
                gradeBreakdown[gradeName].m3 += i.volumeM3 || 0;
              });

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-blue-500/30 bg-blue-50/30 dark:bg-blue-900/10">
                      <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Raw Log</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalRawLogPcs} pcs</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{Number(totalRawLogVolM3.toFixed(3))} m³</p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10">
                      <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Input Mesin (WIP)</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalInputPcs} pcs</p>
                        <p className="text-sm text-muted-foreground mt-0.5">dari {totalTrimmedPcs} log trimming</p>
                      </CardContent>
                    </Card>
                    <Card className="border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10">
                      <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Output Kayu Gergajian</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalOutputPcs} pcs</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{Number(totalOutputM3.toFixed(4))} m³</p>
                      </CardContent>
                    </Card>
                    <Card className={rendemen >= 50 ? "border-purple-500/30 bg-purple-50/30 dark:bg-purple-900/10" : "border-red-500/30 bg-red-50/30 dark:bg-red-900/10"}>
                      <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Rendemen</p>
                        <p className={`text-2xl font-bold ${rendemen >= 50 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600'}`}>{rendemen.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground mt-0.5">Output / Raw Log M³</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="border-b pb-4">
                      <CardTitle>Alur Proses Partai</CardTitle>
                      <CardDescription>Ringkasan volume & jumlah di setiap tahap produksi</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tahap</TableHead>
                            <TableHead className="text-right">Jumlah (Pcs)</TableHead>
                            <TableHead className="text-right">Volume (M³)</TableHead>
                            <TableHead className="text-right">Susut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">2. DUKB (Raw Log Diterima)</TableCell>
                            <TableCell className="text-right">{totalRawLogPcs}</TableCell>
                            <TableCell className="text-right">{Number(totalRawLogVolM3.toFixed(3))}</TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">3. Trimming</TableCell>
                            <TableCell className="text-right">{totalTrimmedPcs}</TableCell>
                            <TableCell className="text-right">{Number(totalTrimmedVolM3.toFixed(3))}</TableCell>
                            <TableCell className="text-right">
                              {totalRawLogVolM3 > 0 && totalTrimmedVolM3 > 0 ? (
                                <span className="text-amber-600 font-medium">-{Number((totalRawLogVolM3 - totalTrimmedVolM3).toFixed(3))} m³</span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">4. Input Mesin (WIP)</TableCell>
                            <TableCell className="text-right">{totalInputPcs}</TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                          </TableRow>
                          <TableRow className="bg-emerald-50/30 dark:bg-emerald-900/10">
                            <TableCell className="font-bold text-emerald-700 dark:text-emerald-400">5. Output Kayu Gergajian (Total)</TableCell>
                            <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">{totalOutputPcs}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">{Number(totalOutputM3.toFixed(4))}</TableCell>
                            <TableCell className="text-right">
                              {totalRawLogVolM3 > 0 ? (
                                <span className={`font-bold ${rendemen >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>Rendemen {rendemen.toFixed(1)}%</span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-blue-50/30 dark:bg-blue-900/10">
                            <TableCell className="font-medium text-blue-700 dark:text-blue-400 pl-8">↳ Sudah POSTED ke Stok</TableCell>
                            <TableCell className="text-right text-blue-700 dark:text-blue-400">{postedPcs}</TableCell>
                            <TableCell className="text-right text-blue-700 dark:text-blue-400">{Number(postedM3.toFixed(4))}</TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {Object.keys(categoryBreakdown).length > 0 && (
                    <Card>
                      <CardHeader className="border-b pb-4">
                        <CardTitle>Rendemen & Rekap per Kategori Produk</CardTitle>
                        <CardDescription>Distribusi Balok (Main Size), Reng/Papan, BS/Afkir & rendemen parsial terhadap Log Raw</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kategori Produk</TableHead>
                              <TableHead className="text-right">Jumlah (Pcs)</TableHead>
                              <TableHead className="text-right">Volume (M³)</TableHead>
                              <TableHead className="text-right">% dari Output</TableHead>
                              <TableHead className="text-right">Rendemen thdp Log (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(categoryBreakdown).map(([catKey, val]) => {
                              const conf = CATEGORY_CONFIG[catKey] || { label: catKey, badgeClass: 'border-slate-500 text-slate-600 bg-slate-50/50' };
                              const pctOutput = totalOutputM3 > 0 ? (val.m3 / totalOutputM3) * 100 : 0;
                              const partialRendemen = totalRawLogVolM3 > 0 ? (val.m3 / totalRawLogVolM3) * 100 : 0;
                              return (
                                <TableRow key={catKey}>
                                  <TableCell>
                                    <Badge variant="outline" className={conf.badgeClass}>{conf.label}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{val.pcs}</TableCell>
                                  <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{Number(val.m3.toFixed(4))}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{pctOutput.toFixed(1)}%</TableCell>
                                  <TableCell className="text-right font-bold text-primary">{partialRendemen.toFixed(2)}%</TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/30 font-bold border-t">
                              <TableCell>Total Output</TableCell>
                              <TableCell className="text-right">{totalOutputPcs}</TableCell>
                              <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{Number(totalOutputM3.toFixed(4))}</TableCell>
                              <TableCell className="text-right">100%</TableCell>
                              <TableCell className={`text-right ${rendemen >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{rendemen.toFixed(2)}%</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {Object.keys(gradeBreakdown).length > 0 && (
                    <Card>
                      <CardHeader className="border-b pb-4">
                        <CardTitle>Output per Grade / Kualitas</CardTitle>
                        <CardDescription>Distribusi hasil gergajian berdasarkan grade</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Grade</TableHead>
                              <TableHead className="text-right">Pcs</TableHead>
                              <TableHead className="text-right">Volume (M³)</TableHead>
                              <TableHead className="text-right">% dari Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(gradeBreakdown).sort((a, b) => b[1].m3 - a[1].m3).map(([gradeName, val]) => (
                              <TableRow key={gradeName}>
                                <TableCell>
                                  {gradeName === 'PENDING'
                                    ? <Badge variant="outline" className="text-amber-500 border-amber-500">BELUM DIISI</Badge>
                                    : <Badge className="bg-primary">{gradeName}</Badge>}
                                </TableCell>
                                <TableCell className="text-right">{val.pcs}</TableCell>
                                <TableCell className="text-right font-bold">{Number(val.m3.toFixed(4))}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {totalOutputM3 > 0 ? ((val.m3 / totalOutputM3) * 100).toFixed(1) + '%' : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {totalRawLogPcs === 0 && totalOutputPcs === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <p className="text-lg font-medium">Belum ada data untuk ditampilkan.</p>
                      <p className="text-sm mt-1">Lengkapi data di tab DUKB, Trimming, dan Output terlebih dahulu.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>
      </Tabs>
    </div>
  );
}
