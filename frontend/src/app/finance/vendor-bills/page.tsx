"use client"
import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { CreditCard, CheckCircle } from"lucide-react"
import { api, FinanceAPI } from"@/lib/api"
import { useToast } from"@/hooks/use-toast"
import { Badge } from"@/components/ui/badge"
import Link from"next/link"

export default function VendorBillsPage() {
 const [bills, setBills] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 

 useEffect(() => {
 fetchBills()
 }, [])

 const fetchBills = async () => {
 try {
 setLoading(true)
 const res = await FinanceAPI.getInvoices({ type: 'AP' })
 setBills(res.data)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const postBill = async (id: string) => {
 try {
 await api.post(`/finance/invoices/${id}/post`)
 alert("Tagihan vendor berhasil diposting")
 fetchBills()
 } catch (err: any) {
 alert((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal posting tagihan")
 }
 }

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Tagihan Vendor (Vendor Bills)</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Daftar tagihan hutang (Account Payables).</p>
 </div>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Daftar Hutang Usaha</CardTitle>
 <CardDescription>Tagihan dari supplier yang harus dibayar.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="rounded-md border overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30 border-b">
 <tr>
 <th className="p-4 text-left font-medium">Nomor Tagihan</th>
 <th className="p-4 text-left font-medium">Referensi PO</th>
 <th className="p-4 text-left font-medium">Total</th>
 <th className="p-4 text-left font-medium">Sisa Hutang / Kredit</th>
 <th className="p-4 text-left font-medium">Status</th>
 <th className="p-4 text-right font-medium">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan={6} className="p-4 text-center">Memuat...</td></tr>
 ) : bills.length === 0 ? (
 <tr><td colSpan={6} className="p-4 text-center">Belum ada tagihan vendor.</td></tr>
 ) : bills.map((bill) => (
 <tr key={bill.id} className="border-b hover:bg-muted/30 dark:hover:bg-slate-900">
 <td className="p-4 font-medium">{bill.invoice_number}</td>
 <td className="p-4">
 {bill.purchase_order?.order_number ? (
 <Link href={`/purchasing/orders?search=${bill.purchase_order.order_number}`} className="text-blue-600 hover:underline">
 {bill.purchase_order.order_number}
 </Link>
 ) : '-'}
 </td>
 <td className="p-4">Rp {bill.total.toLocaleString()}</td>
 <td className="p-4">
    {bill.remaining_amount < 0 ? (
      <span className="text-green-600 font-semibold">Kredit Rp {Math.abs(bill.remaining_amount).toLocaleString()}</span>
    ) : (
      <span>Rp {bill.remaining_amount.toLocaleString()}</span>
    )}
  </td>
 <td className="p-4">
 <Badge variant={bill.status === 'DRAFT' ? 'outline' : bill.status === 'PAID' ? 'default' : 'secondary'}>
 {bill.status}
 </Badge>
 </td>
 <td className="p-4 text-right flex justify-end gap-2">
 {bill.status === 'DRAFT' && (
 <Button size="sm" onClick={() => postBill(bill.id)}>
 <CheckCircle className="w-4 h-4 mr-2" /> Posting (Catat Jurnal)
 </Button>
 )}
 {bill.status === 'POSTED' && bill.remaining_amount > 0 && (
 <Button size="sm" variant="outline" onClick={() => window.location.href ="/finance/ap-payments?bill=" + bill.id}>
 <CreditCard className="w-4 h-4 mr-2" /> Bayar
 </Button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </div>
 )
}




