"use client"
import { useEffect, useState } from "react"
import { use } from "react"
import { TimberAPI } from "@/lib/api"
import { Loader2 } from "lucide-react"

export default function PrintTransferDocument({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    TimberAPI.getTransfer(id).then((res: any) => {
      setData(res)
      setTimeout(() => window.print(), 800)
    }).catch((err: any) => {
      console.error(err)
      setError(true)
    })
  }, [id])

  if (error) {
    return <div className="p-12 text-center text-red-600 font-bold">Document unavailable. Error loading data.</div>
  }

  if (!data) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

  // Calculate totals
  const totalPcs = (data.items || []).reduce((sum: number, i: any) => sum + (Number(i.quantityPcs) || 0), 0)
  const totalVolume = (data.items || []).reduce((sum: number, i: any) => sum + (Number(i.volumeM3) || 0), 0)

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; box-sizing: border-box; }
          @page { size: A4 portrait; margin: 1.5cm; }
        }
      `}} />
      <div id="print-section" className="max-w-[210mm] mx-auto bg-white text-black font-sans text-[12px] leading-relaxed">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider">Internal Stock Transfer</h1>
          <p className="mt-1 font-semibold">No: {data.transferNumber || "-"}</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">Transfer Date</td>
                  <td className="py-1 align-top">: {data.transferDate ? new Date(data.transferDate).toLocaleDateString("id-ID") : "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">Status</td>
                  <td className="py-1 align-top">: {data.status || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">From Location</td>
                  <td className="py-1 align-top font-bold text-gray-800">: {data.fromLocation?.name || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">To Location</td>
                  <td className="py-1 align-top font-bold text-gray-800">: {data.toLocation?.name || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Notes */}
        {data.notes && (
          <div className="mb-6 p-2 border border-gray-300">
            <span className="font-semibold mr-2">Notes:</span> {data.notes}
          </div>
        )}

        {/* Items Table */}
        <h2 className="font-bold text-[13px] uppercase mb-2 border-b border-black pb-1">Items Transferred</h2>
        <table className="w-full border-collapse border border-black mb-6 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-12">No</th>
              <th className="border border-black p-2 text-left">SKU / Variant</th>
              <th className="border border-black p-2 text-center">Species</th>
              <th className="border border-black p-2 text-center">Grade</th>
              <th className="border border-black p-2 text-right">Qty (PCS)</th>
              <th className="border border-black p-2 text-right">Volume (M³)</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item: any, i: number) => (
              <tr key={item.id || i}>
                <td className="border border-black p-2 text-center">{i + 1}</td>
                <td className="border border-black p-2 font-semibold">{item.timberVariant?.sku || "-"}</td>
                <td className="border border-black p-2 text-center">{item.timberVariant?.species || "-"}</td>
                <td className="border border-black p-2 text-center">{item.timberVariant?.grade || "-"}</td>
                <td className="border border-black p-2 text-right">{item.quantityPcs}</td>
                <td className="border border-black p-2 text-right">{item.volumeM3 ? item.volumeM3.toFixed(6) : "0.000000"}</td>
              </tr>
            ))}
            {(!data.items || data.items.length === 0) && (
              <tr>
                <td colSpan={6} className="border border-black p-4 text-center italic">No items found for this transfer.</td>
              </tr>
            )}
          </tbody>
          {data.items && data.items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="border border-black p-2 text-right">TOTAL</td>
                <td className="border border-black p-2 text-right">{totalPcs}</td>
                <td className="border border-black p-2 text-right">{totalVolume.toFixed(6)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Signatures */}
        <div className="flex justify-between mt-16 pt-8 px-8">
          <div className="text-center w-40">
            <div className="h-16"></div>
            <hr className="border-black mb-1" />
            <p className="font-semibold text-[11px]">Warehouse Source</p>
          </div>
          <div className="text-center w-40">
            <div className="h-16"></div>
            <hr className="border-black mb-1" />
            <p className="font-semibold text-[11px]">Courier / Driver</p>
          </div>
          <div className="text-center w-40">
            <div className="h-16"></div>
            <hr className="border-black mb-1" />
            <p className="font-semibold text-[11px]">Warehouse Destination</p>
          </div>
        </div>
      </div>
    </>
  )
}

