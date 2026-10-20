'use client';
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { useState, useEffect } from"react";
import { SawmillProductionAPI } from"@/lib/api";
import { useRouter } from"next/navigation";
import { ArrowLeft, Plus, Trash } from"lucide-react";

export default function CreateSawmillRun() {
 const router = useRouter();
 const [saving, setSaving] = useState(false);
 
 const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
 const [shift, setShift] = useState("1");
 const [operatorId, setOperatorId] = useState("");
 const [workCenterId, setWorkCenterId] = useState("");
 const [notes, setNotes] = useState("");

 const [availableLogs, setAvailableLogs] = useState<any[]>([]);
 const [consumptions, setConsumptions] = useState<{inputLogId: string, consumedM3: number}[]>([]);
 
 // Basic mock output creation, later can be fully dynamic
 const [outputs, setOutputs] = useState<{timberVariantId: string, partai: string, quantityPcs: number}[]>([]);

 useEffect(() => {
 SawmillProductionAPI.getAvailableInputLogs().then(setAvailableLogs).catch(console.error);
 // Real implementation would also fetch Employees & WorkCenters for the selects
 }, []);

 const handleSave = async () => {
 setSaving(true);
 try {
 const payload = {
 productionDate,
 shift,
 operatorId, // Needs real ID
 workCenterId, // Needs real ID
 notes,
 consumptions: consumptions.map(c => ({...c, consumedM3: Number(c.consumedM3)})),
 items: outputs.length > 0 ? [{ variants: outputs.map(o => ({...o, quantityPcs: Number(o.quantityPcs)})) }] : []
 };
 const res = await SawmillProductionAPI.createRun(payload);
 router.push(`/production/sawmill/${res.id}`);
 } catch (err: any) {
 alert((err.response?.data?.error?.message || err.response?.data?.message) || err.message);
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center space-x-4">
 <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2"/> Kembali</Button>
 <h2 className="text-[28px] font-bold tracking-tight text-foreground">Create Production Run</h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card>
 <CardHeader><CardTitle>Informasi Umum</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <Label>Tanggal Produksi</Label>
 <Input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label>Shift</Label>
 <Input type="text" value={shift} onChange={(e) => setShift(e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label>Operator ID</Label>
 <Input type="text" placeholder="e.g. Employee ID" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label>Mesin (WorkCenter ID)</Label>
 <Input type="text" placeholder="e.g. BS04 ID" value={workCenterId} onChange={(e) => setWorkCenterId(e.target.value)} />
 </div>
 <div className="space-y-2">
 <Label>Catatan</Label>
 <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader><CardTitle>Konsumsi Bahan Baku (Input Log)</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 {consumptions.map((c, idx) => (
 <div key={idx} className="flex gap-2 items-end">
 <div className="flex-1 space-y-2">
 <Label>Input Log</Label>
 <select 
 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
 value={c.inputLogId}
 onChange={(e) => {
 const newC = [...consumptions];
 newC[idx].inputLogId = e.target.value;
 setConsumptions(newC);
 }}
 >
 <option value="">-- Pilih Input Log --</option>
 {availableLogs.map(l => (
 <option key={l.id} value={l.id}>{l.inputNumber} (Sisa: {l.remainingVolume} M3)</option>
 ))}
 </select>
 </div>
 <div className="flex-1 space-y-2">
 <Label>Dikonsumsi (M3)</Label>
 <Input type="number" step="0.0001" value={c.consumedM3} onChange={(e) => {
 const newC = [...consumptions];
 newC[idx].consumedM3 = e.target.value as any;
 setConsumptions(newC);
 }} />
 </div>
 <Button variant="destructive" size="icon" onClick={() => setConsumptions(consumptions.filter((_, i) => i !== idx))}>
 <Trash className="h-4 w-4" />
 </Button>
 </div>
 ))}
 <Button variant="outline" className="w-full" onClick={() => setConsumptions([...consumptions, {inputLogId: '', consumedM3: 0}])}>
 <Plus className="mr-2 h-4 w-4" /> Tambah Bahan
 </Button>
 </CardContent>
 </Card>

 <Card className="md:col-span-2">
 <CardHeader><CardTitle>Hasil Kayu Gergajian (Otomatis dibungkus dalam 1 Bundel)</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 {outputs.map((o, idx) => (
 <div key={idx} className="flex gap-2 items-end">
 <div className="flex-1 space-y-2">
 <Label>Timber Variant ID</Label>
 <Input type="text" placeholder="Variant ID" value={o.timberVariantId} onChange={(e) => {
 const newO = [...outputs];
 newO[idx].timberVariantId = e.target.value;
 setOutputs(newO);
 }} />
 </div>
 <div className="flex-1 space-y-2">
 <Label>Partai</Label>
 <Input type="text" value={o.partai} onChange={(e) => {
 const newO = [...outputs];
 newO[idx].partai = e.target.value;
 setOutputs(newO);
 }} />
 </div>
 <div className="flex-1 space-y-2">
 <Label>Qty (Pcs)</Label>
 <Input type="number" value={o.quantityPcs} onChange={(e) => {
 const newO = [...outputs];
 newO[idx].quantityPcs = e.target.value as any;
 setOutputs(newO);
 }} />
 </div>
 <Button variant="destructive" size="icon" onClick={() => setOutputs(outputs.filter((_, i) => i !== idx))}>
 <Trash className="h-4 w-4" />
 </Button>
 </div>
 ))}
 <Button variant="outline" className="w-full" onClick={() => setOutputs([...outputs, {timberVariantId: '', partai: '', quantityPcs: 0}])}>
 <Plus className="mr-2 h-4 w-4" /> Tambah Output
 </Button>
 </CardContent>
 </Card>
 </div>

 <div className="flex justify-end">
 <Button onClick={handleSave} disabled={saving}>
 {saving ? 'Menyimpan...' : 'Simpan DRAFT'}
 </Button>
 </div>
 </div>
 );
}
