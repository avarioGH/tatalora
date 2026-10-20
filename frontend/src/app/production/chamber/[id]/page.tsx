"use client";

import { use } from "react"
import { useState, useEffect } from"react";
import { InventoryAPI } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from"lucide-react";
import { useRouter } from"next/navigation";
import { useToast } from"@/hooks/use-toast";
import { format } from"date-fns";
import { Badge } from"@/components/ui/badge";

export default function ChamberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
 const router = useRouter();
 const { toast } = useToast();
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [processing, setProcessing] = useState(false);

 useEffect(() => {
 fetchData();
 }, [id]);

 const fetchData = async () => {
 setLoading(true);
 try {
 const res = await InventoryAPI.getTransfer(id);
 setData(res);
 } catch (error: any) {
 toast({ title:"Error", description: error.message, variant:"destructive" });
 } finally {
 setLoading(false);
 }
 };

 const handlePost = async () => {
 if (!window.confirm("This action will move stock between the selected locations. Continue?")) return;
 setProcessing(true);
 try {
 await InventoryAPI.postTransfer(id);
 toast({ title:"Success", description:"Transfer posted successfully." });
 fetchData();
 } catch (error: any) {
 toast({ title:"Error", description: error.response?.data?.message || error.message, variant:"destructive" });
 } finally {
 setProcessing(false);
 }
 };

 const handleCancel = async () => {
 if (!window.confirm("This action will reverse the stock movement. Continue?")) return;
 setProcessing(true);
 try {
 await InventoryAPI.cancelTransfer(id);
 toast({ title:"Success", description:"Transfer cancelled successfully." });
 fetchData();
 } catch (error: any) {
 toast({ title:"Error", description: error.response?.data?.message || error.message, variant:"destructive" });
 } finally {
 setProcessing(false);
 }
 };

 if (loading) return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
 if (!data) return <div className="p-8 md:p-24 text-center">Transfer not found.</div>;

 const isFromChamber = data.fromLocation?.code?.startsWith('CH-');
 const isToChamber = data.toLocation?.code?.startsWith('CH-');
 let opType ="TRANSFER";
 if (isToChamber && !isFromChamber) opType ="CHAMBER IN";
 if (isFromChamber && !isToChamber) opType ="CHAMBER OUT";

 return (
 <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 border-b pb-4">
 <div className="flex items-center gap-4">
 <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">{data.transferNumber}</h1>
 <Badge variant={data.status === 'POSTED' ? 'default' : data.status === 'CANCELLED' ? 'destructive' : 'outline'}>{data.status}</Badge>
 <Badge variant="secondary" className="bg-primary/10 text-primary">{opType}</Badge>
 </div>
 <p className="text-muted-foreground mt-1 text-sm">
 Date: {format(new Date(data.transferDate), 'dd MMM yyyy HH:mm')}
 </p>
 </div>
 </div>
 
 <div className="flex gap-2">
 {data.status === 'DRAFT' && (
 <Button onClick={handlePost} disabled={processing} className="">
 {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
 POST Transfer
 </Button>
 )}
 {data.status === 'POSTED' && (
 <Button onClick={handleCancel} disabled={processing} variant="destructive">
 {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
 CANCEL Transfer
 </Button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card>
 <CardHeader className="bg-muted/30 border-b pb-3">
 <CardTitle className="text-sm">From Location</CardTitle>
 </CardHeader>
 <CardContent className="pt-4">
 <p className="font-medium text-lg">{data.fromLocation?.name}</p>
 <p className="text-sm text-muted-foreground">Code: {data.fromLocation?.code}</p>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="bg-muted/30 border-b pb-3">
 <CardTitle className="text-sm">To Location</CardTitle>
 </CardHeader>
 <CardContent className="pt-4">
 <p className="font-medium text-lg">{data.toLocation?.name}</p>
 <p className="text-sm text-muted-foreground">Code: {data.toLocation?.code}</p>
 </CardContent>
 </Card>
 </div>

 <Card>
 <CardHeader className="border-b bg-muted/10 pb-3">
 <CardTitle className="text-[16px] font-semibold">Transfer Items</CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/30">
 <th className="p-3 px-4 text-left font-medium">Timber Variant</th>
 <th className="p-3 px-4 text-left font-medium">SKU</th>
 <th className="p-3 px-4 text-right font-medium">Qty (PCS)</th>
 <th className="p-3 px-4 text-right font-medium">Volume (M³)</th>
 </tr>
 </thead>
 <tbody>
 {data.items?.map((item: any) => (
 <tr key={item.id} className="border-b hover:bg-muted/60 transition-colors">
 <td className="p-3 px-4 font-medium">{item.timberVariant?.name}</td>
 <td className="p-3 px-4 text-muted-foreground">{item.timberVariant?.sku}</td>
 <td className="p-3 px-4 text-right font-bold">{item.quantityPcs}</td>
 <td className="p-3 px-4 text-right text-primary">{item.volumeM3?.toFixed(4)}</td>
 </tr>
 ))}
 {(!data.items || data.items.length === 0) && (
 <tr>
 <td colSpan={4} className="p-4 md:p-8 text-center text-muted-foreground">No items in this transfer.</td>
 </tr>
 )}
 </tbody>
 </table>
 </CardContent>
 </Card>

 <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-lg flex items-start gap-3 mt-8">
 <div className="text-blue-500 mt-0.5">??</div>
 <div>
 <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Traceability Notice</h4>
 <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
 Chamber movement tracks timber by variant and quantity. Physical bundle-level traceability is not currently maintained in the inventory ledger.
 </p>
 </div>
 </div>

 </div>
 );
}
