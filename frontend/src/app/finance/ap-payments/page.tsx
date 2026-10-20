"use client"
import { useState, useEffect, Suspense } from"react"
import { useSearchParams, useRouter } from"next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { DashboardAPI, api, FinanceAPI } from"@/lib/api"
import { useToast } from"@/hooks/use-toast"
import { Badge } from"@/components/ui/badge"

function APPaymentContent() {
 const [payments, setPayments] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const searchParams = useSearchParams()
 const billId = searchParams.get('bill')
 
 const router = useRouter()

 useEffect(() => {
 fetchPayments()
 if (billId) {
 handlePayBill(billId)
 }
 }, [billId])

 const fetchPayments = async () => {
 try {
 setLoading(true)
 const res = await FinanceAPI.getPayments({ type: 'AP' })
 setPayments(res.data)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const handlePayBill = async (id: string) => {
 try {
 // Fetch bill details
 const bill = await api.get(`/finance/invoices/${id}`)
 const amount = bill.data.remaining_amount
 
 // Auto pay full amount for simplicity
 await api.post('/finance/payments', {
 invoiceId: id,
 amount,
 paymentMethod: 'BANK_TRANSFER',
 notes: 'Pelunasan Tagihan Vendor'
 })
 
 alert("Pembayaran berhasil diproses")
 router.push('/finance/ap-payments') // clear query string
 fetchPayments()
 } catch (err: any) {
 alert((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal memproses pembayaran")
 }
 }

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Pembayaran Vendor (AP Payments)</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Daftar pembayaran pengeluaran kas/bank untuk hutang usaha.</p>
 </div>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Riwayat Pembayaran</CardTitle>
 <CardDescription>Pembayaran tagihan vendor Anda.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="rounded-md border overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted/30 border-b">
 <tr>
 <th className="p-4 text-left font-medium">Nomor Bukti</th>
 <th className="p-4 text-left font-medium">Tagihan (Bill)</th>
 <th className="p-4 text-left font-medium">Tanggal Bayar</th>
 <th className="p-4 text-left font-medium">Metode</th>
 <th className="p-4 text-left font-medium">Nominal</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan={5} className="p-4 text-center">Memuat...</td></tr>
 ) : payments.length === 0 ? (
 <tr><td colSpan={5} className="p-4 text-center">Belum ada pembayaran.</td></tr>
 ) : payments.map((pay) => (
 <tr key={pay.id} className="border-b hover:bg-muted/30 dark:hover:bg-slate-900">
 <td className="p-4 font-medium">{pay.payment_number}</td>
 <td className="p-4">{pay.invoice?.invoice_number}</td>
 <td className="p-4">{new Date(pay.payment_date).toLocaleDateString()}</td>
 <td className="p-4">{pay.payment_method}</td>
 <td className="p-4 font-semibold">Rp {pay.amount.toLocaleString()}</td>
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

export default function APPaymentsPage() {
 return (
 <Suspense fallback={<div>Loading...</div>}>
 <APPaymentContent />
 </Suspense>
 )
}


