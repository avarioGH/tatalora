'use client';
import { useEffect, useState } from 'react';
import { TimberAPI } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function YieldReport() {
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 TimberAPI.getYieldReport().then((res: any) => {
 setData(res);
 setLoading(false);
 });
 }, []);

 if (loading) return <div className="p-4 md:p-8">Loading yield report...</div>;

 return (
 <div className="p-4 md:p-8 space-y-6">
 <h1 className="text-2xl font-bold">Production Yield Report</h1>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
 <div className="border p-4 rounded-lg bg-muted/30">
 <p className="text-sm text-gray-500">Total Input Net M??</p>
 <p className="text-2xl font-bold">{data.summary.totalInputM3.toFixed(4)}</p>
 </div>
 <div className="border p-4 rounded-lg bg-muted/30">
 <p className="text-sm text-gray-500">Total Output M??</p>
 <p className="text-2xl font-bold">{data.summary.totalOutputM3.toFixed(4)}</p>
 </div>
 <div className="border p-4 rounded-lg bg-blue-50 text-blue-900 border-blue-200">
 <p className="text-sm font-medium">Overall Yield %</p>
 <p className="text-2xl font-bold">{data.summary.overallYield.toFixed(2)}%</p>
 </div>
 </div>

 <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Input Number</TableHead>
 <TableHead>Species</TableHead>
 <TableHead>Shift</TableHead>
 <TableHead className="text-right">Input Net (M??)</TableHead>
 <TableHead className="text-right">Output (M??)</TableHead>
 <TableHead className="text-right">Yield %</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {data.rows.map((row: any) => (
 <TableRow key={row.inputNumber}>
 <TableCell className="font-mono">{row.inputNumber}</TableCell>
 <TableCell>{row.species}</TableCell>
 <TableCell>{row.shift}</TableCell>
 <TableCell className="text-right font-medium">{row.inputM3.toFixed(4)}</TableCell>
 <TableCell className="text-right font-medium">{row.outputM3.toFixed(4)}</TableCell>
 <TableCell className={`text-right font-bold ${row.yieldPercent > 0 ? 'text-green-700' : 'text-gray-400'}`}>
 {row.yieldPercent.toFixed(2)}%
 </TableCell>
 </TableRow>
 ))}
 {data.rows.length === 0 && (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-gray-500">No yield data available</TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 </div>
 );
}


