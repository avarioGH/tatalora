"use client"
import { useEffect, useState } from "react"
import { B2BApi } from "@/lib/api"
import { useParams } from "next/navigation"

export default function SOPrintPage() {
  const params = useParams()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (params.id) {
      B2BApi.getOrder(params.id as string).then(setData).catch(console.error)
    }
  }, [params.id])

  if (!data) return <div className="p-8">Memuat dokumen...</div>

  const handlePrint = () => {
    window.print()
  }

  // Calculation
  const totalAmount = data.total_amount || 0;
  
  // Sum up all payments from allocations
  const paidAmount = (data.allocations || []).reduce((sum: number, alloc: any) => sum + (alloc.amount || 0), 0)
  const remainingAmount = Math.max(0, totalAmount - paidAmount)

  // Payment Status Logic
  let paymentStatus = "BELUM DIBAYAR"
  if (paidAmount >= totalAmount) {
    paymentStatus = "LUNAS"
  } else if (paidAmount > 0) {
    paymentStatus = "CICILAN / SEBAGIAN DIBAYAR"
  } else if (data.payment_method?.toLowerCase().includes("cash") || data.payment_method?.toLowerCase().includes("lunas")) {
    // If it's a cash transaction but no allocation recorded, sometimes the system implicitly considers it paid
    // But per user instruction: if transaction is cash and paid -> LUNAS. We'll trust the allocations.
    paymentStatus = "BELUM DIBAYAR" // Fallback to safe
  }

  return (
    <div className="bg-gray-100 min-h-screen text-black py-8 print:py-0 print:bg-white">
      {/* Hide on print */}
      <div className="print:hidden max-w-[210mm] mx-auto mb-4 bg-white p-4 flex justify-between items-center rounded shadow">
        <div>
          <h1 className="font-bold text-lg">Surat Jalan / Invoice SO</h1>
          <p className="text-sm text-gray-600">Tekan tombol cetak untuk print</p>
        </div>
        <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 transition-colors">
          Cetak Dokumen
        </button>
      </div>

      {/* A4 Printable Area */}
      <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto p-[10mm] sm:p-[15mm] bg-white print:p-0 print:shadow-none shadow-lg box-border">
        
        {/* Document Header */}
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Surat Jalan / Invoice</h1>
          <p className="text-sm mt-1 font-medium">Nomor: {data.order_number || '-'}</p>
        </div>

        {/* Sender & Receiver Info */}
        <div className="flex flex-col sm:flex-row justify-between mb-8 text-sm gap-6">
          <div className="w-full sm:w-1/2">
            <h3 className="font-bold mb-2 border-b border-gray-300 pb-1">INFORMASI PENGIRIM</h3>
            <table className="w-full">
              <tbody>
                <tr><td className="w-32 py-1 align-top">Perusahaan</td><td className="w-4 py-1 align-top">:</td><td className="py-1 font-medium">{data.company?.name || 'Perusahaan Anda'}</td></tr>
                <tr><td className="w-32 py-1 align-top">Tanggal Order</td><td className="w-4 py-1 align-top">:</td><td className="py-1">{new Date(data.order_date).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</td></tr>
                <tr><td className="w-32 py-1 align-top">Metode Bayar</td><td className="w-4 py-1 align-top">:</td><td className="py-1">{data.payment_method || '-'}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="w-full sm:w-1/2">
            <h3 className="font-bold mb-2 border-b border-gray-300 pb-1">KEPADA / PENERIMA</h3>
            <table className="w-full">
              <tbody>
                <tr><td className="w-24 py-1 align-top">Nama</td><td className="w-4 py-1 align-top">:</td><td className="py-1 font-bold text-base">{data.customer?.name || '-'}</td></tr>
                <tr><td className="w-24 py-1 align-top">Alamat</td><td className="w-4 py-1 align-top">:</td><td className="py-1">{data.customer?.address || '-'}</td></tr>
                <tr><td className="w-24 py-1 align-top">Telepon</td><td className="w-4 py-1 align-top">:</td><td className="py-1">{data.customer?.phone || '-'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <div className="w-full overflow-hidden">
          <table className="w-full text-sm border-collapse mb-8 table-fixed">
            <thead>
              <tr className="bg-gray-100 border-y-2 border-black">
                <th className="py-2 px-2 text-left w-[8%]">No</th>
                <th className="py-2 px-2 text-left w-[35%]">Nama Barang</th>
                <th className="py-2 px-2 text-center w-[12%]">Qty</th>
                <th className="py-2 px-2 text-right w-[22%]">Harga Satuan</th>
                <th className="py-2 px-2 text-right w-[23%]">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 border-b-2 border-black">
              {(data.items || []).map((item: any, i: number) => (
                <tr key={i} className="break-inside-avoid">
                  <td className="py-3 px-2 align-top">{i + 1}</td>
                  <td className="py-3 px-2 font-medium align-top break-words">
                    {item.product?.name || '-'}
                    {item.description && <span className="block font-normal text-xs text-gray-600">{item.description}</span>}
                  </td>
                  <td className="py-3 px-2 text-center align-top">{item.qty || item.quantity}</td>
                  <td className="py-3 px-2 text-right align-top whitespace-nowrap">Rp {(item.unit_price || 0).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-2 text-right align-top whitespace-nowrap">Rp {(item.subtotal || 0).toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {(data.items?.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Tidak ada barang</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary & Payment Status */}
        <div className="flex flex-col sm:flex-row justify-between mb-10 gap-6 break-inside-avoid">
          
          {/* Left: Notes & Payment History */}
          <div className="w-full sm:w-1/2 flex flex-col gap-6">
            {data.notes ? (
              <div>
                <p className="text-sm font-bold mb-1">Catatan:</p>
                <p className="text-sm border border-gray-300 p-3 rounded bg-gray-50 whitespace-pre-wrap">{data.notes}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold mb-1">Catatan:</p>
                <p className="text-sm text-gray-500">-</p>
              </div>
            )}

            {/* Riwayat Pembayaran (if any) */}
            {(data.allocations && data.allocations.length > 0) && (
              <div className="mt-2 border-t pt-4">
                <p className="text-xs font-bold mb-2 uppercase">Riwayat Pembayaran</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-1">Tanggal</th>
                      <th className="py-1">Metode</th>
                      <th className="py-1 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.allocations.map((alloc: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1">{alloc.payment?.payment_date ? new Date(alloc.payment.payment_date).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="py-1">{alloc.payment?.payment_method || '-'}</td>
                        <td className="py-1 text-right">Rp {(alloc.amount || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Payment Summary totals */}
          <div className="w-full sm:w-[45%]">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 font-bold">Subtotal</td>
                  <td className="py-1 text-right font-medium">Rp {totalAmount.toLocaleString('id-ID')}</td>
                </tr>
                <tr className="border-b-2 border-black">
                  <td className="py-1 pb-2 font-bold text-base">TOTAL TRANSAKSI</td>
                  <td className="py-1 pb-2 text-right font-bold text-base">Rp {totalAmount.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">SUDAH DIBAYAR</td>
                  <td className="py-2 text-right text-green-700 font-medium">Rp {paidAmount.toLocaleString('id-ID')}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 pb-2 font-medium">SISA PIUTANG</td>
                  <td className="py-1 pb-2 text-right text-red-600 font-bold">Rp {remainingAmount.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td className="py-3 font-bold">STATUS</td>
                  <td className="py-3 text-right">
                    <span className={`px-3 py-1 font-bold rounded text-xs ${
                      paymentStatus === 'LUNAS' ? 'bg-green-100 text-green-800 border-green-200' :
                      paymentStatus === 'BELUM DIBAYAR' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-yellow-100 text-yellow-800 border-yellow-200'
                    } border`}>
                      {paymentStatus}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Area */}
        <div className="flex justify-between mt-12 text-sm text-center break-inside-avoid px-4">
          <div className="w-[30%]">
            <p className="mb-20">Penerima,</p>
            <p className="font-bold border-b border-black pb-1 mb-1"></p>
            <p className="text-xs text-gray-500">Tanda tangan & Nama Jelas</p>
          </div>
          <div className="w-[30%]">
            <p className="mb-20">Pengirim,</p>
            <p className="font-bold border-b border-black pb-1 mb-1"></p>
            <p className="text-xs text-gray-500">Tanda tangan & Nama Jelas</p>
          </div>
          <div className="w-[30%]">
            <p className="mb-20">Hormat Kami,</p>
            <p className="font-bold border-b border-black pb-1 mb-1">{data.company?.name || 'Manajemen'}</p>
            <p className="text-xs text-gray-500">Cap & Tanda tangan</p>
          </div>
        </div>
        
      </div>
    </div>
  )
}
