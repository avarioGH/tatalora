"use client";

import { useState, useEffect } from"react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { InventoryAPI, TimberAPI } from"@/lib/api";
import { ArrowRight, ArrowLeftRight, Search, Loader2, ThermometerSun, Cuboid } from"lucide-react";
import { Input } from"@/components/ui/input";
import { Badge } from"@/components/ui/badge";
import { useRouter } from"next/navigation";
import { useToast } from"@/hooks/use-toast";
import { format } from"date-fns";

export default function ChamberOperationsPage() {
 const [data, setData] = useState<any[]>([]);
 const [stats, setStats] = useState({ totalPcs: 0, totalM3: 0, inTodayPcs: 0, inTodayM3: 0, outTodayPcs: 0, outTodayM3: 0 });
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const router = useRouter();
 const { toast } = useToast();

 useEffect(() => {
 fetchData();
 }, [search]);

 const fetchData = async () => {
 setLoading(true);
 try {
 // 1. Fetch transfers involving chambers
 const transfersRes = await InventoryAPI.getTransfers({ 
 search, 
 fromLocationCodePrefix: 'CH-', 
 toLocationCodePrefix: 'CH-',
 take: 100
 });
 const items = transfersRes.items || [];
 setData(items);

 // 2. Fetch total Chamber stock
 const stockRes = await TimberAPI.getTimberStock({ locationCodePrefix: 'CH-', take: 1000 });
 const chamberStocks = stockRes.items || [];
 const totalPcs = chamberStocks.reduce((sum: number, s: any) => sum + (s.currentPcs || 0), 0);
 const totalM3 = chamberStocks.reduce((sum: number, s: any) => sum + (s.currentVolumeM3 || 0), 0);

 // 3. Calculate Today's IN/OUT
 const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
 const todayTransfers = (Array.isArray(items) ? items : []).filter((t: any) => t.transferDate.startsWith(today) && t.status === 'POSTED');
 
 let inPcs = 0, inM3 = 0, outPcs = 0, outM3 = 0;
 todayTransfers.forEach((t: any) => {
 const isToChamber = t.toLocation?.code?.startsWith('CH-');
 const isFromChamber = t.fromLocation?.code?.startsWith('CH-');
 
 t.items?.forEach((ti: any) => {
 if (isToChamber && !isFromChamber) {
 inPcs += ti.quantityPcs || 0;
 inM3 += ti.volumeM3 || 0;
 }
 if (isFromChamber && !isToChamber) {
 outPcs += ti.quantityPcs || 0;
 outM3 += ti.volumeM3 || 0;
 }
 });
 });

 setStats({ totalPcs, totalM3, inTodayPcs: inPcs, inTodayM3: inM3, outTodayPcs: outPcs, outTodayM3: outM3 });

 } catch (error: any) {
 toast({ title:"Error", description: error.message, variant:"destructive" });
 } finally {
 setLoading(false);
 }
 };

 const getOperationType = (t: any) => {
 const isFromChamber = t.fromLocation?.code?.startsWith('CH-');
 const isToChamber = t.toLocation?.code?.startsWith('CH-');
 if (isToChamber && !isFromChamber) return { label: 'CHAMBER IN', color: 'bg-emerald-100 text-emerald-800' };
 if (isFromChamber && !isToChamber) return { label: 'CHAMBER OUT', color: 'bg-amber-100 text-amber-800' };
 return { label: 'TRANSFER', color: 'bg-muted/50 text-foreground' };
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-300 pb-10">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground">Chamber Operations</h1>
 <p className="text-muted-foreground mt-1">Manage timber drying physical movements.</p>
 </div>
 <div className="flex gap-2">
 <Button onClick={() => router.push('/production/chamber/in')} className="">
 <ArrowRight className="w-4 h-4 mr-2" /> Chamber IN
 </Button>
 <Button onClick={() => router.push('/production/chamber/out')} className="bg-amber-600 hover:bg-amber-700 text-white">
 <ArrowLeftRight className="w-4 h-4 mr-2" /> Chamber OUT
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <Card className="bg-primary/5 border-primary/20">
 <CardContent className="p-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 space-y-0 pb-2">
 <p className="text-sm font-medium">Chamber Stock</p>
 <Cuboid className="h-4 w-4 text-muted-foreground" />
 </div>
 <div className="text-2xl font-bold">{stats.totalPcs} PCS</div>
 <p className="text-xs text-muted-foreground mt-1">Total pieces currently inside chambers</p>
 </CardContent>
 </Card>
 <Card className="bg-primary/5 border-primary/20">
 <CardContent className="p-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 space-y-0 pb-2">
 <p className="text-sm font-medium">Chamber Volume</p>
 <Cuboid className="h-4 w-4 text-muted-foreground" />
 </div>
 <div className="text-2xl font-bold">{stats.totalM3.toFixed(4)} M³</div>
 <p className="text-xs text-muted-foreground mt-1">Total volume currently inside chambers</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 space-y-0 pb-2">
 <p className="text-sm font-medium">In Today</p>
 <ArrowRight className="h-4 w-4 text-emerald-500" />
 </div>
 <div className="text-2xl font-bold">{stats.inTodayPcs} PCS</div>
 <p className="text-xs text-muted-foreground mt-1">{stats.inTodayM3.toFixed(4)} M³ entering today</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 space-y-0 pb-2">
 <p className="text-sm font-medium">Out Today</p>
 <ArrowLeftRight className="h-4 w-4 text-amber-500" />
 </div>
 <div className="text-2xl font-bold">{stats.outTodayPcs} PCS</div>
 <p className="text-xs text-muted-foreground mt-1">{stats.outTodayM3.toFixed(4)} M³ exiting today</p>
 </CardContent>
 </Card>
 </div>

 <Card>
 <CardHeader className="pb-3 border-b bg-muted/10">
 <div className="flex justify-between items-center">
 <CardTitle className="text-[16px] font-semibold">Transfer History</CardTitle>
 <div className="relative w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input 
 placeholder="Search transfer no..." 
 className="pl-9 h-9" 
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? (
 <div className="flex justify-center p-4 md:p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
 ) : data.length === 0 ? (
 <div className="text-center p-4 md:p-8 text-muted-foreground">No chamber operations found.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th className="p-3 px-4 text-left font-medium">Date</th>
 <th className="p-3 px-4 text-left font-medium">Operation</th>
 <th className="p-3 px-4 text-left font-medium">Transfer No</th>
 <th className="p-3 px-4 text-left font-medium">From Location</th>
 <th className="p-3 px-4 text-left font-medium">To Location</th>
 <th className="p-3 px-4 text-right font-medium">Items</th>
 <th className="p-3 px-4 text-right font-medium">Qty (PCS)</th>
 <th className="p-3 px-4 text-left font-medium">Status</th>
 </tr>
 </thead>
 <tbody>
 {data.map((t) => {
 const op = getOperationType(t);
 const totalQty = t.items?.reduce((s: number, i: any) => s + (i.quantityPcs || 0), 0) || 0;
 return (
 <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push('/production/chamber/' + t.id)}>
 <td className="p-3 px-4 whitespace-nowrap">{format(new Date(t.transferDate), 'dd MMM yyyy')}</td>
 <td className="p-3 px-4"><Badge className={op.color} variant="secondary">{op.label}</Badge></td>
 <td className="p-3 px-4 font-medium text-primary">{t.transferNumber}</td>
 <td className="p-3 px-4">{t.fromLocation?.name}</td>
 <td className="p-3 px-4">{t.toLocation?.name}</td>
 <td className="p-3 px-4 text-right">{t.items?.length || 0}</td>
 <td className="p-3 px-4 text-right font-medium">{totalQty}</td>
 <td className="p-3 px-4">
 <Badge variant={t.status === 'POSTED' ? 'default' : t.status === 'CANCELLED' ? 'destructive' : 'outline'}>{t.status}</Badge>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
