'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { formatIDR as formatCurrency } from '@/lib/utils';
import { Truck, Receipt, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PurchaseOrderDetailPage() {
 const params = useParams();
 const id = params.id as string;
 const router = useRouter();
 const { toast } = useToast();
 
 const [po, setPo] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);
 const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

 useEffect(() => {
 fetchPO();
 }, [id]);

 const fetchPO = async () => {
 try {
 setLoading(true);
 const res = await api.get(`/purchasing/orders/${id}`);
 setPo(res.data);
 // init receiveQtys
 const qtys: Record<string, number> = {};
 res.data.items.forEach((item: any) => {
 qtys[item.id] = Math.max(0, item.qty - (item.received_qty || 0));
 });
 setReceiveQtys(qtys);
 } catch (err) {
 console.error(err);
 toast({ title: 'Error', description: 'Failed to fetch PO', variant: 'destructive' });
 } finally {
 setLoading(false);
 }
 };

 const handleQtyChange = (itemId: string, val: string) => {
 setReceiveQtys(prev => ({ ...prev, [itemId]: parseFloat(val) || 0 }));
 };

 const confirmPO = async () => {
 try {
 setActionLoading(true);
 await api.post(`/purchasing/rfq/${id}/confirm`, {});
 toast({ title: 'PO Confirmed' });
 fetchPO();
 } catch (err: any) {
 toast({ title: 'Error', description: (err.response?.data?.error?.message || err.response?.data?.message) || 'Error confirming', variant: 'destructive' });
 } finally {
 setActionLoading(false);
 }
 };

 const receiveGoods = async () => {
 try {
 setActionLoading(true);
 const payload = {
 items: po.items.map((i: any) => ({
 productId: i.product_id,
 qty: receiveQtys[i.id]
 })).filter((i:any) => i.qty > 0)
 };
 if (payload.items.length === 0) return toast({ title: 'Notice', description: 'No quantities entered' });
 
 await api.post(`/purchasing/orders/${id}/receive`, payload);
 toast({ title: 'Goods Received Successfully' });
 fetchPO();
 } catch (err: any) {
 toast({ title: 'Receiving Error', description: (err.response?.data?.error?.message || err.response?.data?.message) || 'Error receiving', variant: 'destructive' });
 } finally {
 setActionLoading(false);
 }
 };

 const createBill = async () => {
 try {
 setActionLoading(true);
 const payload = {
 items: po.items.map((i: any) => ({
 productId: i.product_id,
 qty: i.qty - (i.billed_qty || 0)
 })).filter((i:any) => i.qty > 0),
 dueDate: new Date(Date.now() + 30 * 86400000).toISOString()
 };
 if (payload.items.length === 0) return toast({ title: 'Notice', description: 'No quantities to bill' });
 
 const bill = await api.post(`/purchasing/orders/${id}/bill`, payload);
 toast({ title: 'Vendor Bill Created' });
 fetchPO();
 // Wait briefly then redirect to finance bill
 setTimeout(() => {
 router.push(`/finance/vendor-bills`);
 }, 1000);
 } catch (err: any) {
 toast({ title: 'Billing Error', description: (err.response?.data?.error?.message || err.response?.data?.message) || 'Error billing', variant: 'destructive' });
 } finally {
 setActionLoading(false);
 }
 };

 if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading PO...</div>;
 if (!po) return <div className="p-12 text-center text-red-500">PO not found</div>;

 return (
 <div className="space-y-6 animate-in fade-in pb-12">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-lg border shadow-sm">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">{po.order_number}</h1>
 <p className="text-[14px] text-muted-foreground mt-1">
 Supplier: <Link href="/crm/partners" className="text-primary hover:underline">{po.supplier?.name}</Link> | Date: {new Date(po.order_date).toLocaleDateString()}
 </p>
 </div>
 <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
 <Badge variant={po.status === 'CONFIRMED' ? 'default' : 'outline'}>{po.status}</Badge>
 <Badge variant={po.receipt_status === 'RECEIVED' ? 'default' : 'secondary'}>Receipt: {po.receipt_status}</Badge>
 <Badge variant={po.bill_status === 'BILLED' ? 'default' : 'secondary'}>Bill: {po.bill_status}</Badge>
 <Badge variant={po.payment_status === 'PAID' ? 'default' : 'secondary'}>Payment: {po.payment_status}</Badge>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-6">
 <Card>
 <CardHeader className="border-b bg-muted/10 pb-4">
 <CardTitle>Procurement Items & Receiving</CardTitle>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30">
 <tr>
 <th className="p-4 text-left font-medium text-muted-foreground">Product</th>
 <th className="p-4 text-center font-medium text-muted-foreground">Ordered</th>
 <th className="p-4 text-center font-medium text-primary bg-emerald-50/50">Received</th>
 <th className="p-4 text-center font-medium text-muted-foreground">Remaining</th>
 {po.status === 'CONFIRMED' && po.receipt_status !== 'RECEIVED' && (
 <th className="p-4 text-center font-medium text-primary bg-indigo-50/50">Receive Now</th>
 )}
 </tr>
 </thead>
 <tbody>
 {po.items.map((item: any) => {
 const remaining = item.qty - (item.received_qty || 0);
 return (
 <tr key={item.id} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
 <td className="p-4 font-medium">{item.product?.name || item.product_id}</td>
 <td className="p-4 text-center">{item.qty}</td>
 <td className="p-4 text-center font-bold text-primary bg-emerald-50/20">{item.received_qty || 0}</td>
 <td className="p-4 text-center text-muted-foreground">{Math.max(0, remaining)}</td>
 {po.status === 'CONFIRMED' && po.receipt_status !== 'RECEIVED' && (
 <td className="p-4 bg-indigo-50/20">
 <Input 
 type="number" 
 min="0" 
 max={remaining}
 value={receiveQtys[item.id] ?? ''} 
 onChange={(e) => handleQtyChange(item.id, e.target.value)}
 className="w-24 text-center mx-auto border-indigo-200 focus-visible:ring-indigo-500"
 />
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="border-b bg-muted/10 pb-4">
 <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Three-Way Matching Status</CardTitle>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30">
 <tr>
 <th className="p-4 text-left font-medium text-muted-foreground">Product</th>
 <th className="p-4 text-center font-medium text-muted-foreground">PO Qty</th>
 <th className="p-4 text-center font-medium text-muted-foreground">Receipt Qty</th>
 <th className="p-4 text-center font-medium text-muted-foreground">Bill Qty</th>
 <th className="p-4 text-center font-medium text-muted-foreground">Status</th>
 </tr>
 </thead>
 <tbody>
 {po.items.map((item: any) => {
 const received = item.received_qty || 0;
 const billed = item.billed_qty || 0;
 let matchStatus ="MATCHED";
 let matchColor ="text-primary bg-emerald-50";
 
 if (received < item.qty) {
 matchStatus ="PENDING RECEIPT";
 matchColor ="text-amber-600 bg-amber-50";
 }
 if (billed > received) {
 matchStatus ="EXCEPTION (Billed > Received)";
 matchColor ="text-red-600 bg-red-50 font-bold";
 } else if (billed < received) {
 matchStatus ="PENDING BILL";
 matchColor ="text-blue-600 bg-blue-50";
 }

 return (
 <tr key={'match-'+item.id} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
 <td className="p-4 font-medium">{item.product?.name || item.product_id}</td>
 <td className="p-4 text-center">{item.qty}</td>
 <td className="p-4 text-center">{received}</td>
 <td className="p-4 text-center">{billed}</td>
 <td className="p-4 text-center">
 <span className={`px-2 py-1 rounded text-xs ${matchColor}`}>
 {matchStatus}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </div>

 <div className="space-y-6">
 <Card>
 <CardHeader className="border-b bg-muted/10 pb-4">
 <CardTitle>Commercial Details</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 pt-6">
 <div className="flex justify-between items-center pb-2 border-b">
 <span className="text-muted-foreground">Subtotal</span>
 <span className="font-medium">{formatCurrency(po.total_amount)}</span>
 </div>
 <div className="flex justify-between items-center text-lg font-bold">
 <span>Total</span>
 <span className="text-primary">{formatCurrency(po.total_amount)}</span>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="border-b bg-muted/10 pb-4">
 <CardTitle>Workflow Actions</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 pt-6">
 {po.status === 'DRAFT' && (
 <Button onClick={confirmPO} disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-700">
 Confirm Purchase Order
 </Button>
 )}
 
 {po.status === 'CONFIRMED' && po.receipt_status !== 'RECEIVED' && (
 <Button onClick={receiveGoods} disabled={actionLoading} className="w-full">
 <Truck className="w-4 h-4 mr-2" /> Receive Goods
 </Button>
 )}
 
 {po.status === 'CONFIRMED' && po.bill_status !== 'BILLED' && po.receipt_status !== 'PENDING' && (
 <Button onClick={createBill} disabled={actionLoading} className="w-full bg-purple-600 hover:bg-purple-700">
 <Receipt className="w-4 h-4 mr-2" /> Handoff: Create Vendor Bill
 </Button>
 )}

 {po.bill_status === 'BILLED' && (
 <Link href="/finance/vendor-bills" className="w-full block">
 <Button variant="outline" className="w-full">
 <ExternalLink className="w-4 h-4 mr-2" /> View Bills in Finance
 </Button>
 </Link>
 )}

 {po.payment_status === 'UNPAID' && po.bill_status === 'BILLED' && (
 <Link href="/finance/ap-payments" className="w-full block">
 <Button variant="outline" className="w-full">
 <ExternalLink className="w-4 h-4 mr-2" /> AP Payments (Finance)
 </Button>
 </Link>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
