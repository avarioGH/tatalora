'use client';
import { useEffect, useState } from 'react';
import { TimberAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function StockByProductReport() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await TimberAPI.getStockSummary({ search });
      // Group by product
      const grouped = res.reduce((acc: any, row: any) => {
        const key = row.product || 'Unknown Product';
        if (!acc[key]) acc[key] = { product: key, pcs: 0, m3: 0, variants: [] };
        acc[key].pcs += row.qty;
        acc[key].m3 += row.m3;
        acc[key].variants.push(row);
        return acc;
      }, {});
      setData(Object.values(grouped));
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
        <h1 className="text-3xl font-bold">Stock by Product</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Inventory Valuation by Product</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
            <Button onClick={fetchReport}><Search className="w-4 h-4 mr-2"/>Filter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3">Product / Species</th>
                  <th className="p-3 text-right">Total PCS</th>
                  <th className="p-3 text-right">Total Net M³</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={3} className="text-center p-4">Loading...</td></tr> : 
                 data.length === 0 ? <tr><td colSpan={3} className="text-center p-4">No data found.</td></tr> :
                 data.map((row: any, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3 font-medium text-blue-600">{row.product}</td>
                    <td className="p-3 text-right font-bold">{row.pcs}</td>
                    <td className="p-3 text-right font-bold text-green-600">{row.m3.toFixed(4)}</td>
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

