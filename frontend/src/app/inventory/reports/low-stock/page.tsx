'use client';
import { useEffect, useState } from 'react';
import { TimberAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function LowStockReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await TimberAPI.getStockSummary({});
      // Filter out those with less than some threshold (e.g. < 50 pcs or 0)
      const lowStock = res.filter((r: any) => r.qty < 50).sort((a: any, b: any) => a.qty - b.qty);
      setData(lowStock);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory/reports"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4"/></Button></Link>
        <h1 className="text-3xl font-bold flex items-center gap-2"><AlertTriangle className="text-red-500 w-8 h-8"/> Low / Zero Stock</h1>
      </div>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Items Requiring Replenishment ( &lt; 50 PCS )</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Location</th>
                  <th className="p-3 text-right">Current PCS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr> : 
                 data.length === 0 ? <tr><td colSpan={5} className="text-center p-4 text-green-600 font-bold">No low stock items! All good.</td></tr> :
                 data.map((row: any, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 font-mono">{row.sku}</td>
                    <td className="p-3">{row.product}</td>
                    <td className="p-3">{row.size}</td>
                    <td className="p-3 text-muted-foreground">{row.location}</td>
                    <td className="p-3 text-right font-bold">{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

