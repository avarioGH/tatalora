"use client";
import { useState, useEffect } from"react";
import { ExpenseAPI, HrAPI, FinanceAPI, ApprovalAPI } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from"@/components/ui/dialog";
import { Input } from"@/components/ui/input";
import { Loader2, Plus, ArrowRight, Trash2 } from"lucide-react";
import Link from"next/link";

export default function ExpensePage() {
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [employees, setEmployees] = useState<any[]>([]);
 const [categories, setCategories] = useState<any[]>([]);
 
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [errorMsg, setErrorMsg] = useState("");

 const [form, setForm] = useState({
 employeeId:"",
 title:"",
 description:"",
 items: [{ categoryId:"", amount:"", description:"" }]
 });

 const loadData = () => {
 setLoading(true);
 ExpenseAPI.getClaims().then((res: any) => {
 setData(res || []);
 setLoading(false);
 }).catch(console.error);
 };

 useEffect(() => {
 loadData();
 HrAPI.getEmployees().then((res: any) => setEmployees(res || [])).catch(() => {});
 FinanceAPI.getCategories().then((res: any) => setCategories((res || []).filter((c:any) => c.type === 'EXPENSE'))).catch(() => {});
 }, []);

 const handleAddItem = () => {
 setForm({ ...form, items: [...form.items, { categoryId:"", amount:"", description:"" }] });
 };

 const handleRemoveItem = (index: number) => {
 const newItems = [...form.items];
 newItems.splice(index, 1);
 setForm({ ...form, items: newItems });
 };

 const handleItemChange = (index: number, field: string, value: string) => {
 const newItems = [...form.items] as any;
 newItems[index][field] = value;
 setForm({ ...form, items: newItems });
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setErrorMsg("");
 if (!form.employeeId || !form.title || form.items.length === 0) {
 setErrorMsg("Please fill in required fields.");
 return;
 }

 const payload = {
 employeeId: form.employeeId,
 title: form.title,
 description: form.description,
 items: form.items.map(item => ({
 categoryId: item.categoryId,
 amount: Number(item.amount),
 description: item.description
 }))
 };

 setSubmitting(true);
 try {
 const res = await ExpenseAPI.createClaim(payload);
 
 if (res && res.id) {
 try {
 await ExpenseAPI.submitClaim(res.id);
 await ApprovalAPI.requestApproval({
 module: 'EXPENSE_CLAIM',
 referenceId: res.id,
 title: `Expense Claim: ${res.title}`,
 description: res.description
 }).catch((e:any) => console.log('approval req err', e));
 } catch (e) {
 console.log("Auto-submit failed", e);
 }
 }

 setIsModalOpen(false);
 setForm({ employeeId:"", title:"", description:"", items: [{ categoryId:"", amount:"", description:"" }] });
 loadData();
 } catch (err: any) {
 setErrorMsg(err?.response?.data?.message || err.message ||"Failed to create claim");
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Expense Claims</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Manage employee expense claims.</p>
 </div>
 <Button onClick={() => setIsModalOpen(true)} data-testid="new-claim-btn"><Plus className="w-4 h-4 mr-2" /> New Claim</Button>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Expense Claims</CardTitle>
 <CardDescription>View all expense claims.</CardDescription>
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
 <th className="p-4 text-left">Purpose</th>
 <th className="p-4 text-left">Date</th>
 <th className="p-4 text-right">Total Amount</th>
 <th className="p-4 text-left">Status</th>
 <th className="p-4 text-right">Approval</th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? (
 <tr><td colSpan={6} className="p-4 text-center">No expense claims found.</td></tr>
 ) : data.map((item: any) => (
 <tr key={item.id} className="border-b" data-testid={`claim-row-${item.id}`}>
 <td className="p-4 font-medium">{item.employee?.first_name} {item.employee?.last_name}</td>
 <td className="p-4" data-testid={`claim-title-${item.id}`}>{item.title || item.purpose}</td>
 <td className="p-4">{new Date(item.created_at).toLocaleDateString()}</td>
 <td className="p-4 text-right" data-testid={`claim-amount-${item.id}`}>Rp {Number(item.total_amount || 0).toLocaleString()}</td>
 <td className="p-4">
 <Badge variant={item.status === 'DRAFT' ? 'outline' : item.status === 'APPROVED' ? 'default' : 'secondary'} data-testid={`status-${item.id}`}>
 {item.status}
 </Badge>
 </td>
 <td className="p-4 text-right flex justify-end gap-2">
 {item.status === 'APPROVED' && (
 <Button variant="outline" size="sm" data-testid={`post-btn-${item.id}`} onClick={async () => {
 try {
 await ExpenseAPI.postClaim(item.id);
 loadData();
 } catch(e) { console.error(e); }
 }}>Post</Button>
 )}
 <Link href={`/approvals`}>
 <Button variant="ghost" size="sm" data-testid={`approve-btn-${item.id}`}>View <ArrowRight className="w-4 h-4 ml-1" /></Button>
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

 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
 <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>New Expense Claim</DialogTitle>
 <DialogDescription>Submit a new expense claim for reimbursement.</DialogDescription>
 </DialogHeader>
 <form onSubmit={handleSubmit} className="space-y-4">
 {errorMsg && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded" data-testid="error-msg">{errorMsg}</div>}
 
 <div className="space-y-2">
 <label className="text-sm font-medium">Employee</label>
 <select 
 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
 value={form.employeeId}
 onChange={e => setForm({...form, employeeId: e.target.value})}
 data-testid="employee-select"
 required
 >
 <option value="">Select Employee</option>
 {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Purpose / Title</label>
 <Input 
 value={form.title} 
 onChange={e => setForm({...form, title: e.target.value})} 
 placeholder="e.g., Client Meeting Jakarta" 
 data-testid="title-input"
 required 
 />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Description</label>
 <Input 
 value={form.description} 
 onChange={e => setForm({...form, description: e.target.value})} 
 placeholder="Optional details" 
 />
 </div>

 <div className="space-y-4 pt-4 border-t">
 <div className="flex justify-between items-center">
 <h3 className="text-sm font-semibold">Expense Items</h3>
 <Button type="button" variant="outline" size="sm" onClick={handleAddItem} data-testid="add-item-btn"><Plus className="w-4 h-4 mr-1" /> Add</Button>
 </div>

 {form.items.map((item, idx) => (
 <div key={idx} className="flex gap-2 items-start border p-3 rounded bg-muted/30">
 <div className="space-y-3 flex-1">
 <select 
 className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
 value={item.categoryId}
 onChange={e => handleItemChange(idx, 'categoryId', e.target.value)}
 data-testid={`item-category-${idx}`}
 required
 >
 <option value="">Select Category</option>
 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
 </select>
 <div className="flex gap-2">
 <Input 
 placeholder="Amount" 
 type="number" 
 value={item.amount} 
 onChange={e => handleItemChange(idx, 'amount', e.target.value)} 
 className="w-1/3 h-9"
 data-testid={`item-amount-${idx}`}
 required 
 />
 <Input 
 placeholder="Description" 
 value={item.description} 
 onChange={e => handleItemChange(idx, 'description', e.target.value)} 
 className="flex-1 h-9"
 required 
 />
 </div>
 </div>
 {form.items.length > 1 && (
 <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)}>
 <Trash2 className="w-4 h-4 text-destructive" />
 </Button>
 )}
 </div>
 ))}
 </div>

 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
 <Button type="submit" disabled={submitting} data-testid="submit-claim-btn">
 {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
 Submit Claim
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
