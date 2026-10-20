'use client';
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Box, PackageSearch, AlertTriangle, ArrowRightLeft } from"lucide-react";
import { useEffect, useState } from"react";
import { api } from"@/lib/api";
import { formatCurrency } from"@/lib/utils";

export default function InventoryDashboard() {
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const fetchData = async () => {
 try {
 const res = await api.get('/inventory/dashboard');
 setData(res.data);
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };
 fetchData();
 }, []);

 if (loading) return <div className="p-4 md:p-8 text-center">Loading Inventory...</div>;
 if (!data) return <div className="p-4 md:p-8 text-center text-red-500">Failed to load dashboard</div>;

 return (
 <div className="p-6 space-y-6">
 <div className="flex justify-between items-center">
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Inventory Dashboard</h1>
 </div>

 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Total On Hand (Qty)</CardTitle>
 <Box className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{data.total_on_hand}</div>
 <p className="text-xs text-muted-foreground">Physical stock in warehouses</p>
 </CardContent>
 </Card>
 
 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
 <PackageSearch className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">{data.available_stock}</div>
 <p className="text-xs text-muted-foreground">Ready for allocation</p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Reserved Stock</CardTitle>
 <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-orange-600">{data.reserved_stock}</div>
 <p className="text-xs text-muted-foreground">Committed (SO/MO)</p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
 <AlertTriangle className="h-4 w-4 text-red-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-red-600">{data.low_stock_items}</div>
 <p className="text-xs text-muted-foreground">Items below reorder point</p>
 </CardContent>
 </Card>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Recent Stock Movements</CardTitle>
 </CardHeader>
 <CardContent>
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="p-3">Date</th>
 <th className="p-3">Type</th>
 <th className="p-3">Product</th>
 <th className="p-3">In</th>
 <th className="p-3">Out</th>
 <th className="p-3">Balance After</th>
 </tr>
 </thead>
 <tbody>
 {data.recent_movements?.map((m: any) => (
 <tr key={m.id} className="border-b">
 <td className="p-3">{new Date(m.created_at).toLocaleString()}</td>
 <td className="p-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{m.movement_type}</span></td>
 <td className="p-3 font-medium">{m.product_id}</td>
 <td className="p-3 text-green-600">{m.qty_in > 0 ? m.qty_in : '-'}</td>
 <td className="p-3 text-red-600">{m.qty_out > 0 ? m.qty_out : '-'}</td>
 <td className="p-3 font-mono">{m.balance_after}</td>
 </tr>
 ))}
 {(!data.recent_movements || data.recent_movements.length === 0) && (
 <tr><td colSpan={6} className="p-4 md:p-8 text-center text-gray-500">No recent movements.</td></tr>
 )}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </div>
 );
}
