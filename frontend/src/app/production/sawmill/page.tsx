'use client';
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Input } from"@/components/ui/input";
import { useEffect, useState } from"react";
import { SawmillProductionAPI } from"@/lib/api";
import { Plus, Eye, Search } from"lucide-react";
import { useRouter } from"next/navigation";

export default function SawmillProductionList() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 
 // Filters
 const [search, setSearch] = useState("");
 const [status, setStatus] = useState("");
 const [shift, setShift] = useState("");
 
 const router = useRouter();

 const loadData = async () => {
 setLoading(true);
 try {
 const res = await SawmillProductionAPI.getRuns({ search, status, shift });
 setData(res.items || []);
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const getStatusBadge = (s: string) => {
 if (s === 'DRAFT') return <Badge variant="secondary">DRAFT</Badge>;
 if (s === 'POSTED') return <Badge className="bg-green-600">POSTED</Badge>;
 if (s === 'CANCELLED') return <Badge variant="destructive">CANCELLED</Badge>;
 return <Badge>{s}</Badge>;
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-[28px] font-bold tracking-tight text-foreground">Sawmill Production</h2>
 <p className="text-muted-foreground">Manage sawmill production runs and yield.</p>
 </div>
 <Button onClick={() => router.push('/production/sawmill/create')}>
 <Plus className="mr-2 h-4 w-4" /> New Production Run
 </Button>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Production Runs</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex flex-wrap gap-4 mb-4">
 <div className="w-64">
 <Input 
 placeholder="Cari No. Produksi..." 
 value={search} 
 onChange={e => setSearch(e.target.value)} 
 />
 </div>
 <select 
 className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
 value={status} onChange={e => setStatus(e.target.value)}
 >
 <option value="">Semua Status</option>
 <option value="DRAFT">DRAFT</option>
 <option value="POSTED">POSTED</option>
 <option value="CANCELLED">CANCELLED</option>
 </select>
 <select 
 className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
 value={shift} onChange={e => setShift(e.target.value)}
 >
 <option value="">Semua Shift</option>
 <option value="1">Shift 1</option>
 <option value="2">Shift 2</option>
 </select>
 <Button variant="secondary" onClick={loadData}>
 <Search className="h-4 w-4 mr-2" /> Terapkan Filter
 </Button>
 </div>

 {loading ? (
 <p>Loading...</p>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>No. Produksi</TableHead>
 <TableHead>Tanggal</TableHead>
 <TableHead>Shift</TableHead>
 <TableHead>Operator</TableHead>
 <TableHead>Mesin</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="text-right">Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {data.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center">No data found.</TableCell>
 </TableRow>
 ) : (
 data.map((row: any) => (
 <TableRow key={row.id}>
 <TableCell className="font-medium">{row.productionNo}</TableCell>
 <TableCell>{new Date(row.productionDate).toLocaleDateString()}</TableCell>
 <TableCell>Shift {row.shift}</TableCell>
 <TableCell>{row.operator?.name || row.operatorId}</TableCell>
 <TableCell>{row.workCenter?.name || row.workCenterId}</TableCell>
 <TableCell>{getStatusBadge(row.status)}</TableCell>
 <TableCell className="text-right">
 <Button variant="ghost" size="sm" onClick={() => router.push(`/production/sawmill/${row.id}`)}>
 <Eye className="h-4 w-4 mr-2" /> Detail
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
