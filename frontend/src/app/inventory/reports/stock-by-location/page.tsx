'use client';
import { useEffect, useState } from 'react';
import { TimberAPI } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StockByLocationReport() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [locationId, setLocationId] = useState('');

 useEffect(() => {
 TimberAPI.getStockSummary(locationId ? { locationId } : {}).then((res: any) => {
 setData(res || []);
 setLoading(false);
 });
 }, [locationId]);

 if (loading) return <div className="p-4 md:p-8">Loading report...</div>;

 // Group by location
 const grouped = data.reduce((acc, row) => {
 const loc = row.location?.name || 'Unknown';
 if (!acc[loc]) acc[loc] = [];
 acc[loc].push(row);
 return acc;
 }, {});

 let grandPcs = 0;
 let grandM3 = 0;

 return (
 <div className="p-4 md:p-8 space-y-6">
 <div className="flex justify-between items-center">
 <h1 className="text-2xl font-bold">Stock By Location</h1>
 <Button variant="outline" onClick={() => window.print()}>Export / Print</Button>
 </div>

 <div className="space-y-8">
 {Object.entries(grouped).map(([locName, rows]: [string, any]) => {
 let locPcs = 0;
 let locM3 = 0;
 return (
 <div key={locName} className="border rounded-lg p-4 bg-card shadow-sm">
 <h2 className="text-xl font-semibold mb-4 border-b pb-2">{locName}</h2>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>SKU</TableHead>
 <TableHead>Product / Species</TableHead>
 <TableHead>Size (T x W x L)</TableHead>
 <TableHead className="text-right">PCS</TableHead>
 <TableHead className="text-right">M??</TableHead>
 <TableHead>Action</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {rows.map((row: any) => {
 locPcs += row.currentPcs;
 locM3 += row.currentVolumeM3;
 grandPcs += row.currentPcs;
 grandM3 += row.currentVolumeM3;
 return (
 <TableRow key={row.id}>
 <TableCell className="font-mono text-sm">{row.timberVariant?.sku}</TableCell>
 <TableCell>{row.timberVariant?.product?.name || row.timberVariant?.species}</TableCell>
 <TableCell>{row.timberVariant?.thickness} ?? {row.timberVariant?.width} ?? {row.timberVariant?.length}</TableCell>
 <TableCell className="text-right font-medium">{row.currentPcs}</TableCell>
 <TableCell className="text-right font-medium">{row.currentVolumeM3.toFixed(4)}</TableCell>
 <TableCell>
 <Link href={`/inventory/timber-stock/${row.timberVariantId}/${row.locationId}/card`} className="text-blue-600 hover:underline">
 Card
 </Link>
 </TableCell>
 </TableRow>
 );
 })}
 <TableRow className="bg-muted/30 font-bold">
 <TableCell colSpan={3} className="text-right">Location Total:</TableCell>
 <TableCell className="text-right">{locPcs}</TableCell>
 <TableCell className="text-right">{locM3.toFixed(4)}</TableCell>
 <TableCell></TableCell>
 </TableRow>
 </TableBody>
 </Table>
 </div>
 );
 })}

 <div className="bg-blue-900 text-white p-4 rounded-lg flex justify-between items-center text-lg font-bold">
 <span>GRAND TOTAL</span>
 <div className="flex gap-12">
 <span>{grandPcs} PCS</span>
 <span>{grandM3.toFixed(4)} M??</span>
 </div>
 </div>
 </div>
 </div>
 );
}


