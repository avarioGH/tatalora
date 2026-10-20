'use client';
import { useEffect, useState } from 'react';
import { FinanceAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Eye } from 'lucide-react';

export default function PaymentsPage() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => { fetchPayments(); }, []);

 const fetchPayments = async () => {
 try {
 const res = await FinanceAPI.getPayments({ page: 1, limit: 50, type: 'AR' });
 setData(res?.data || []);
 } catch (error) { console.error(error); } finally { setLoading(false); }
 };

 if (loading) return <div className="flex p-4 md:p-8 justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

 return (
 <div className="p-6 space-y-6">
 <h1 className="text-2xl font-bold">Pembayaran AR (Payments)</h1>
 <Card>
 <CardContent className="p-0">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="p-4 text-left">Nomor</th>
 <th className="p-4 text-left">Faktur Ref</th>
 <th className="p-4 text-left">Metode</th>
 <th className="p-4 text-left">Tanggal</th>
 <th className="p-4 text-right">Nominal</th>
 <th className="p-4 text-center">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? (
 <tr><td colSpan={6} className="text-center p-4 md:p-8 text-gray-500">Belum ada pembayaran.</td></tr>
 ) : data.map((item) => (
 <tr key={item.id} className="border-b">
 <td className="p-4">{item.payment_number}</td>
 <td className="p-4">{item.invoice?.invoice_number || '-'}</td>
 <td className="p-4">{item.payment_method}</td>
 <td className="p-4">{new Date(item.payment_date).toLocaleDateString('id-ID')}</td>
 <td className="p-4 text-right font-medium text-green-600">Rp {item.amount?.toLocaleString('id-ID')}</td>
 <td className="p-4 text-center"><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></td>
 </tr>
 ))}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </div>
 );
}
