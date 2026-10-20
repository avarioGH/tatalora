"use client";
import { useState, useEffect } from"react";
import { AssetAPI } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Loader2, Plus, ArrowRight } from"lucide-react";
import Link from"next/link";

export default function AssetsPage() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 AssetAPI.getAssets().then((res: any) => {
 setData(res || []);
 setLoading(false);
 }).catch(console.error);
 }, []);

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Asset Register</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Manage fixed assets, capitalization, and depreciation.</p>
 </div>
 <Button><Plus className="w-4 h-4 mr-2" /> Register Asset</Button>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Fixed Assets</CardTitle>
 <CardDescription>View all fixed assets.</CardDescription>
 </CardHeader>
 <CardContent>
 {loading ? (
 <div className="flex p-4 md:p-8 justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
 ) : (
 <div className="rounded-md border overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30 border-b">
 <tr>
 <th className="p-4 text-left">Asset Code</th>
 <th className="p-4 text-left">Name</th>
 <th className="p-4 text-left">Category</th>
 <th className="p-4 text-right">Purchase Price</th>
 <th className="p-4 text-right">Book Value</th>
 <th className="p-4 text-left">Status</th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? (
 <tr><td colSpan={6} className="p-4 text-center">No assets found.</td></tr>
 ) : data.map((item: any) => (
 <tr key={item.id} className="border-b">
 <td className="p-4 font-medium">{item.asset_code}</td>
 <td className="p-4">{item.asset_name}</td>
 <td className="p-4">{item.category?.name || '-'}</td>
 <td className="p-4 text-right">Rp {Number(item.purchase_price || 0).toLocaleString()}</td>
 <td className="p-4 text-right">Rp {Number(item.current_value || item.purchase_price || 0).toLocaleString()}</td>
 <td className="p-4">
 <Badge variant={item.status === 'ACTIVE' ? 'default' : item.status === 'DISPOSED' ? 'destructive' : 'secondary'}>
 {item.status}
 </Badge>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
