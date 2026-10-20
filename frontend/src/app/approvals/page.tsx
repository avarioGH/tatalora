"use client";
import { useState, useEffect } from"react";
import { ApprovalAPI } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from"lucide-react";

export default function ApprovalsPage() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchApprovals = () => {
 setLoading(true);
 ApprovalAPI.getPendingApprovals().then((res: any) => {
 setData(res || []);
 setLoading(false);
 }).catch(console.error);
 };

 useEffect(() => {
 fetchApprovals();
 }, []);

 const handleApprove = async (id: string) => {
 try {
 await ApprovalAPI.approve(id,"Approved from dashboard");
 fetchApprovals();
 } catch (e) {
 console.error(e);
 }
 };

 const handleReject = async (id: string) => {
 try {
 await ApprovalAPI.reject(id,"Rejected from dashboard");
 fetchApprovals();
 } catch (e) {
 console.error(e);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Approval Center</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Review and action pending requests across all modules.</p>
 </div>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Pending Approvals</CardTitle>
 <CardDescription>Documents requiring your attention.</CardDescription>
 </CardHeader>
 <CardContent>
 {loading ? (
 <div className="flex p-4 md:p-8 justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
 ) : (
 <div className="rounded-md border overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30 border-b">
 <tr>
 <th className="p-4 text-left">Module</th>
 <th className="p-4 text-left">Title</th>
 <th className="p-4 text-left">Reference ID</th>
 <th className="p-4 text-left">Status</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? (
 <tr><td colSpan={5} className="p-4 text-center">No pending approvals.</td></tr>
 ) : data.map((item: any) => (
 <tr key={item.id} className="border-b">
 <td className="p-4 font-medium capitalize">{item.module}</td>
 <td className="p-4">{item.title}</td>
 <td className="p-4 text-muted-foreground">{item.reference_id}</td>
 <td className="p-4">
 <Badge variant="outline">{item.status}</Badge>
 </td>
 <td className="p-4 text-right flex justify-end gap-2">
 <Button size="sm" onClick={() => handleApprove(item.id)} className="">
 <CheckCircle className="w-4 h-4 mr-2" /> Approve
 </Button>
 <Button size="sm" variant="destructive" onClick={() => handleReject(item.id)}>
 <XCircle className="w-4 h-4 mr-2" /> Reject
 </Button>
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
