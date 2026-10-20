'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Loader2, RefreshCcw } from 'lucide-react';

export default function PaymentReconciliationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/integrations/tripay/transactions');
      setData(res?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (extRefId: string) => {
    try {
      await api.post(`/integrations/tripay/payments/${extRefId}/sync`);
      alert('Sync Berhasil');
      fetchTransactions();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Sync gagal');
    }
  };

  if (loading) return <div className="flex p-8 justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Reconciliation</h1>
        <Button onClick={fetchTransactions} variant="outline" size="sm">
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">Reference</th>
                <th className="p-4 text-left">Invoice ID</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-4">{item.external_id}</td>
                  <td className="p-4">{item.entity_id}</td>
                  <td className="p-4 text-right">Rp {item.metadata?.amount?.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-center">
                    {item.metadata?.status === 'PAID' ? <Badge className="bg-green-500">Paid</Badge> : 
                     item.metadata?.status === 'FAILED' ? <Badge className="bg-red-500">Failed</Badge> : 
                     <Badge variant="secondary">{item.metadata?.status || 'PENDING'}</Badge>}
                  </td>
                  <td className="p-4 text-center">
                    <Button size="sm" onClick={() => handleSync(item.id)} variant="outline">
                      Sync Status
                    </Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">Belum ada transaksi</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}