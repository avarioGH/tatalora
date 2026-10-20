'use client';
import { useEffect, useState } from 'react';
import { FinanceAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Loader2, Plus, Eye } from 'lucide-react';

export default function InvoicesPage() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => { fetchInvoices(); }, []);

 const handlePayTripay = async (invoiceId: string) => {
 try {
 const res = await api.post('/integrations/tripay/pay', { invoiceId });
 if (res.data?.redirect_url) {
 window.location.href = res.data.redirect_url;
 }
 } catch (error: any) {
 alert(error.response?.data?.message || 'Gagal membuat pembayaran Tripay');
 }
 };

 const fetchInvoices = async () => {
 try {
 const res = await FinanceAPI.getInvoices({ page: 1, limit: 50, type: 'AR' });
 setData(res?.data || []);
 } catch (error) { console.error(error); } finally { setLoading(false); }
 };

 if (loading) return <div className="flex p-4 md:p-8 justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

 return (
 <div className="p-6 space-y-6">
 <h1 className="text-2xl font-bold">Faktur Penjualan (Invoices)</h1>
 <Card>
 <CardContent className="p-0">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="p-4 text-left">Faktur</th>
 <th className="p-4 text-left">Customer</th>
 <th className="p-4 text-left">Due Date</th>
 <th className="p-4 text-right">Total</th>
 <th className="p-4 text-right">Terbayar</th>
 <th className="p-4 text-right">Sisa</th>
 <th className="p-4 text-center">Status</th>
 <th className="p-4 text-center">Aksi</th>
 <th className="p-4 text-center">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? (
 <tr><td colSpan={8} className="text-center p-4 md:p-8 text-gray-500">Belum ada faktur.</td></tr>
 ) : data.map((item) => (
 <tr key={item.id} className="border-b">
 <td className="p-4">{item.invoice_number}</td>
 <td className="p-4">{item.customer?.name || '-'}</td>
 <td className="p-4">{new Date(item.due_date).toLocaleDateString('id-ID')}</td>
 <td className="p-4 text-right">Rp {item.total?.toLocaleString('id-ID')}</td>
 <td className="p-4 text-right">Rp {item.paid_amount?.toLocaleString('id-ID')}</td>
 <td className="p-4 text-right font-medium">Rp {item.remaining_amount?.toLocaleString('id-ID')}</td>
 <td className="p-4 text-center">
 {item.status === 'PAID' ? <Badge className="bg-green-500">Paid</Badge> : 
 item.status === 'POSTED' ? <Badge className="bg-blue-500">Posted</Badge> : 
 <Badge variant="secondary">Draft</Badge>}
 </td>
 <td className="p-4 text-center"><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></td>
 <td className="p-4 text-center">
 {item.status !== 'PAID' && item.remaining_amount > 0 && (
 <Button size="sm" onClick={() => handlePayTripay(item.id)} variant="outline">
 Bayar Online
 </Button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </div>
 );
}
