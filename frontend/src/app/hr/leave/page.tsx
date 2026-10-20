"use client";
import { useState, useEffect } from"react";
import { HrAPI } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Loader2, Plus, ArrowRight } from"lucide-react";
import Link from"next/link";

export default function LeavePage() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 HrAPI.getLeaves().then((res: any) => {
 setData(res || []);
 setLoading(false);
 }).catch(console.error);
 }, []);

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Leave Management</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Manage employee leave requests.</p>
 </div>
 <Button><Plus className="w-4 h-4 mr-2" /> Request Leave</Button>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Leave Requests</CardTitle>
 <CardDescription>View all leave requests.</CardDescription>
 </CardHeader>
 <CardContent>
 {loading ? (
 <div className="flex p-4 md:p-8 justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
 ) : (
 <div className="rounded-md border overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30 border-b">
 <tr>
 <th className="p-4 text-left">Employee</th>
 <th className="p-4 text-left">Type</th>
 <th className="p-4 text-left">Start Date</th>
 <th className="p-4 text-left">End Date</th>
 <th className="p-4 text-left">Status</th>
 <th className="p-4 text-right">Approval</th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? (
 <tr><td colSpan={6} className="p-4 text-center">No leave requests found.</td></tr>
 ) : data.map((item: any) => (
 <tr key={item.id} className="border-b">
 <td className="p-4 font-medium">{item.employee?.first_name} {item.employee?.last_name}</td>
 <td className="p-4">{item.leave_type}</td>
 <td className="p-4">{new Date(item.start_date).toLocaleDateString()}</td>
 <td className="p-4">{new Date(item.end_date).toLocaleDateString()}</td>
 <td className="p-4">
 <Badge variant={item.status === 'PENDING' ? 'outline' : item.status === 'APPROVED' ? 'default' : 'secondary'}>
 {item.status}
 </Badge>
 </td>
 <td className="p-4 text-right">
 <Link href={`/approvals?ref=${item.id}`}>
 <Button variant="ghost" size="sm">View <ArrowRight className="w-4 h-4 ml-1" /></Button>
 </Link>
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
