"use client";
import { useEffect, useState } from"react";
import { useSearchParams, useRouter } from"next/navigation";
import { PurchasingAPI } from"@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { formatIDR } from"@/lib/utils";
import { ArrowLeft, CheckCircle2, PackageSearch } from"lucide-react";
import { useToast } from"@/hooks/use-toast";

export default function SupplierComparisonPage() {
 const searchParams = useSearchParams();
 const productId = searchParams.get("product_id");
 const prId = searchParams.get("pr_id");
 const qty = searchParams.get("qty") ? parseFloat(searchParams.get("qty") as string) : 1;
 const router = useRouter();
 const { toast } = useToast();

 const [comparisons, setComparisons] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [converting, setConverting] = useState(false);

 useEffect(() => {
 if (!productId) {
 setLoading(false);
 return;
 }
 PurchasingAPI.getVendorComparison(productId)
 .then((res: any) => {
 setComparisons(res || []);
 })
 .catch((err: any) => {
 console.error(err);
 toast({ title:"Error", description:"Failed to load supplier comparison", variant:"destructive" });
 })
 .finally(() => setLoading(false));
 }, [productId, toast]);

 const awardSupplier = async (partnerId: string, unitPrice: number) => {
 if (!prId) return;
 setConverting(true);
 try {
 // Create an RFQ (DRAFT PO) for the selected supplier
 const payload = {
 partnerId,
 orderDate: new Date().toISOString(),
 items: [{ productId, qty, price: unitPrice }],
 notes: `Converted from PR ${prId}`
 };
 const rfq = await PurchasingAPI.createRFQ(payload);
 toast({ title:"RFQ Created", description:"Supplier awarded successfully." });
 router.push(`/purchasing/rfqs`);
 } catch (e: any) {
 toast({ title:"Error", description: e.response?.data?.message ||"Failed to award supplier", variant:"destructive" });
 } finally {
 setConverting(false);
 }
 };

 if (loading) return <div className="p-4 md:p-8 text-center text-muted-foreground">Loading comparison data...</div>;
 if (!productId) return <div className="p-4 md:p-8 text-center text-red-500">No Product ID provided.</div>;

 return (
 <div className="space-y-6 animate-in fade-in pb-10">
 <div className="flex items-center gap-4">
 <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Supplier Comparison</h1>
 <p className="text-muted-foreground mt-1 flex items-center gap-2"><PackageSearch className="w-4 h-4" /> Compare vendors for selected product</p>
 </div>
 </div>

 <Card>
 <CardHeader className="bg-muted/30 border-b">
 <CardTitle>Comparison Matrix</CardTitle>
 </CardHeader>
 <CardContent className="p-0 overflow-x-auto">
 {comparisons.length === 0 ? (
 <div className="p-12 text-center text-muted-foreground">SUPPLIER RESPONSE UI NOT AVAILABLE — BACKEND CONTRACT REQUIRED (No vendor data found for this product).</div>
 ) : (
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/10">
 <tr>
 <th className="p-4 text-left font-medium text-muted-foreground border-b">Supplier</th>
 <th className="p-4 text-right font-medium text-muted-foreground border-b">Unit Price</th>
 <th className="p-4 text-center font-medium text-muted-foreground border-b">Lead Time (Days)</th>
 <th className="p-4 text-center font-medium text-muted-foreground border-b">MOQ</th>
 <th className="p-4 text-center font-medium text-muted-foreground border-b">Availability</th>
 {prId && <th className="p-4 text-center font-medium text-muted-foreground border-b">Decision</th>}
 </tr>
 </thead>
 <tbody>
 {comparisons.map((c) => (
 <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
 <td className="p-4 font-bold">{c.supplier?.name}</td>
 <td className="p-4 text-right text-primary font-semibold">{formatIDR(c.unit_price)}</td>
 <td className="p-4 text-center">{c.lead_time_days}</td>
 <td className="p-4 text-center">{c.minimum_order_qty}</td>
 <td className="p-4 text-center">{c.active ?"Available" :"Unavailable"}</td>
 {prId && (
 <td className="p-4 text-center">
 <Button 
 size="sm" 
 disabled={converting || !c.active || qty < c.minimum_order_qty}
 onClick={() => awardSupplier(c.partner_id, c.unit_price)}
 className=""
 >
 <CheckCircle2 className="w-4 h-4 mr-2" /> Award & Create RFQ
 </Button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
