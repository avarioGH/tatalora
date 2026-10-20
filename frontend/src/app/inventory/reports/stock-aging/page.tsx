'use client';
import { useEffect, useState } from 'react';
import { TimberAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StockAgingReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await TimberAPI.getStockAging();
      setData(res || []);
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
        <h1 className="text-3xl font-bold">Stock Aging (FIFO)</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventory Aging by Days in Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Size</th>
                  <th className="p-3 text-right">Total PCS</th>
                  <th className="p-3 text-right">0-7 Days</th>
                  <th className="p-3 text-right">8-30 Days</th>
                  <th className="p-3 text-right">31-60 Days</th>
                  <th className="p-3 text-right">61-90 Days</th>
                  <th className="p-3 text-right">91-180 Days</th>
                  <th className="p-3 text-right text-red-600">&gt; 180 Days</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={10} className="text-center p-4">Loading...</td></tr> : 
                 data.length === 0 ? <tr><td colSpan={10} className="text-center p-4">No data found.</td></tr> :
                 data.map((row: any, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 font-mono text-xs">{row.sku}</td>
                    <td className="p-3">{row.product}</td>
                    <td className="p-3">{row.size}</td>
                    <td className="p-3 text-right font-bold">{row.qty}</td>
                    <td className="p-3 text-right text-green-600">{row.buckets?.['0_7'] || 0}</td>
                    <td className="p-3 text-right">{row.buckets?.['8_30'] || 0}</td>
                    <td className="p-3 text-right text-orange-400">{row.buckets?.['31_60'] || 0}</td>
                    <td className="p-3 text-right text-orange-600">{row.buckets?.['61_90'] || 0}</td>
                    <td className="p-3 text-right text-red-400">{row.buckets?.['91_180'] || 0}</td>
                    <td className="p-3 text-right font-bold text-red-600">{row.buckets?.['180_plus'] || 0}</td>
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

