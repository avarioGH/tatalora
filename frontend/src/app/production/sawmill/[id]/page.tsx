'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, use } from "react";
import { SawmillProductionAPI, InventoryAPI } from "@/lib/api";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export default function SawmillRunDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  
  const [locationId, setLocationId] = useState("");
  const router = useRouter();

 const loadData = async () => {
 try {
 const [resRun, resWh] = await Promise.all([
 SawmillProductionAPI.getRun(id),
 InventoryAPI.getWarehouses()
 ]);
 setData(resRun);
 setWarehouses(resWh);
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 const handlePost = async () => {
 if (!locationId) return alert('Pilih Location ID / Warehouse terlebih dahulu!');
 
 // Breakdown totals for confirmation
 const totalConsumed = data.consumptions.reduce((sum: number, c: any) => sum + c.consumedM3, 0);
 const totalOutputPcs = data.outputItems.reduce((sum: number, o: any) => sum + o.quantityPcs, 0);
 const totalOutputM3 = data.outputItems.reduce((sum: number, o: any) => sum + o.volumeM3, 0);
 const whName = warehouses.find(w => w.id === locationId)?.name || locationId;

 const msg = `KONFIRMASI POSTING\n\nNo: ${data.productionNo}\nInput Terpakai: ${totalConsumed} M3\nOutput Dihasilkan: ${totalOutputPcs} Pcs (${totalOutputM3.toFixed(4)} M3)\nLokasi Tujuan: ${whName}\n\nLanjutkan?`;

 if (!confirm(msg)) return;
 setPosting(true);
 try {
 await SawmillProductionAPI.postRun(id, { locationId });
 alert('Berhasil di-POST');
 loadData();
 } catch (err: any) {
 alert((err.response?.data?.error?.message || err.response?.data?.message) || err.message);
 } finally {
 setPosting(false);
 }
 };

 const handleCancel = async () => {
 if (!locationId) return alert('Pilih Location ID / Warehouse (Reversal) terlebih dahulu!');
 if (!confirm('KONFIRMASI REVERSAL\n\nMutasi stok OUT (Reversal) akan dicatat di Ledger.\nDokumen ini akan dibatalkan secara permanen.\nLanjutkan?')) return;
 
 setPosting(true);
 try {
 await SawmillProductionAPI.cancelRun(id, { locationId });
 alert('Berhasil di-CANCEL');
 loadData();
 } catch (err: any) {
 alert((err.response?.data?.error?.message || err.response?.data?.message) || err.message);
 } finally {
 setPosting(false);
 }
 };

 if (loading) return <p>Loading...</p>;
 if (!data) return <p>Data not found.</p>;

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center flex-wrap gap-4">
 <div className="flex items-center space-x-4">
 <Button variant="ghost" onClick={() => router.push('/production/sawmill')}>
 <ArrowLeft className="h-4 w-4 mr-2"/> Kembali
 </Button>
 <h2 className="text-[28px] font-bold tracking-tight text-foreground">Detail Produksi: {data.productionNo}</h2>
 <Badge variant={data.status === 'POSTED' ? 'default' : data.status === 'CANCELLED' ? 'destructive' : 'secondary'}>
 {data.status}
 </Badge>
 </div>
 
 <div className="flex items-center space-x-4 flex-wrap">
 {(data.status === 'DRAFT' || data.status === 'POSTED') && (
 <div className="flex items-center space-x-2">
 <Label>Location / Warehouse:</Label>
 <select 
 className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
 value={locationId} 
 onChange={e => setLocationId(e.target.value)}
 >
 <option value="">-- Pilih Lokasi --</option>
 {warehouses.map(w => (
 <option key={w.id} value={w.id}>{w.name}</option>
 ))}
 </select>
 </div>
 )}

 {data.status === 'DRAFT' && (
 <Button onClick={handlePost} disabled={posting} className="">
 <CheckCircle className="mr-2 h-4 w-4" /> POST
 </Button>
 )}
 {data.status === 'POSTED' && (
 <Button onClick={handleCancel} disabled={posting} variant="destructive">
 <XCircle className="mr-2 h-4 w-4" /> CANCEL (Reversal)
 </Button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card>
 <CardHeader><CardTitle>Informasi Umum</CardTitle></CardHeader>
 <CardContent className="space-y-2">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
 <Label className="text-muted-foreground">Tanggal</Label>
 <div>{new Date(data.productionDate).toLocaleDateString()}</div>
 <Label className="text-muted-foreground">Shift</Label>
 <div>{data.shift}</div>
 <Label className="text-muted-foreground">Operator</Label>
 <div>{data.operator?.name || data.operatorId}</div>
 <Label className="text-muted-foreground">Mesin</Label>
 <div>{data.workCenter?.name || data.workCenterId}</div>
 <Label className="text-muted-foreground">Catatan</Label>
 <div>{data.notes || '-'}</div>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader><CardTitle>Konsumsi Input Log</CardTitle></CardHeader>
 <CardContent>
 <Table>
 <TableHeader><TableRow><TableHead>Log No</TableHead><TableHead className="text-right">Volume (M3)</TableHead></TableRow></TableHeader>
 <TableBody>
 {data.consumptions?.map((c: any) => (
 <TableRow key={c.id}>
 <TableCell>{c.inputLog?.inputNumber || c.inputLogId}</TableCell>
 <TableCell className="text-right">{c.consumedM3.toFixed(4)}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 <Card className="md:col-span-2">
 <CardHeader><CardTitle>Hasil Kayu Gergajian</CardTitle></CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Bundel No.</TableHead>
 <TableHead>Partai</TableHead>
 <TableHead>Ukuran (T x W x L)</TableHead>
 <TableHead className="text-right">Qty (Pcs)</TableHead>
 <TableHead className="text-right">Volume (M3)</TableHead>
 <TableHead>Stock Ref</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {data.outputItems?.map((o: any) => (
 <TableRow key={o.id}>
 <TableCell>{o.bundle?.bundleNumber || '-'}</TableCell>
 <TableCell>{o.partai}</TableCell>
 <TableCell>
 {o.timberVariant ? `${o.timberVariant.thickness}x${o.timberVariant.width}x${o.timberVariant.length}` : o.timberVariantId}
 </TableCell>
 <TableCell className="text-right">{o.quantityPcs}</TableCell>
 <TableCell className="text-right">{o.volumeM3.toFixed(4)}</TableCell>
 <TableCell>
 <div className="flex flex-col gap-1">
 {o.stockMovementId ? <Badge className="bg-green-500 w-fit">IN: {o.stockMovementId.slice(-6)}</Badge> : <span className="text-muted-foreground">-</span>}
 {o.reversalMovementId ? <Badge className="bg-red-500 w-fit">REV: {o.reversalMovementId.slice(-6)}</Badge> : null}
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
