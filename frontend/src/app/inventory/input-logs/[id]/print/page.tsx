"use client"
import { useEffect, useState } from "react"
import { use } from "react"
import { api } from "@/lib/api"
import { Loader2 } from "lucide-react"

export default function PrintInputTally({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get(`/inventory/input-logs/${id}`).then((res: any) => {
      setData(res.data)
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
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wider text-center">Input Log Tally</h1>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">Input Number</td>
                  <td className="py-1 align-top">: {data.inputNumber || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">Date</td>
                  <td className="py-1 align-top">: {data.date ? new Date(data.date).toLocaleDateString("id-ID") : (data.createdAt ? new Date(data.createdAt).toLocaleDateString("id-ID") : "-")}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">Shift</td>
                  <td className="py-1 align-top">: {data.shift || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">Machine</td>
                  <td className="py-1 align-top">: {data.machine || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold w-1/3 align-top">Partai</td>
                  <td className="py-1 align-top">: {data.partai || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Table */}
        <table className="w-full border-collapse border border-black mb-6 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-12">No</th>
              <th className="border border-black p-2 text-left">Trim Code</th>
              <th className="border border-black p-2 text-right">Length (m)</th>
              <th className="border border-black p-2 text-right">Net M³</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((item: any, i: number) => (
              <tr key={item.id || i}>
                <td className="border border-black p-2 text-center">{i + 1}</td>
                <td className="border border-black p-2 font-medium">{item.trimmedLog?.trimCode || "-"}</td>
                <td className="border border-black p-2 text-right">{item.trimmedLog?.length || "-"}</td>
                <td className="border border-black p-2 text-right">{item.trimmedLog?.netVolume || "-"}</td>
              </tr>
            ))}
            {(!data.items || data.items.length === 0) && (
              <tr>
                <td colSpan={4} className="border border-black p-4 text-center italic">No logs attached.</td>
              </tr>
            )}
          </tbody>
          {data.items && data.items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={2} className="border border-black p-2 text-right">TOTAL</td>
                <td className="border border-black p-2 text-right">{data.totalLength ? Number(data.totalLength).toFixed(2) : "-"}</td>
                <td className="border border-black p-2 text-right">{data.totalNetVolume ? Number(data.totalNetVolume).toFixed(4) : "-"}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Signatures */}
        <div className="flex justify-between mt-16 pt-8 px-8">
          <div className="text-center w-40">
            <div className="h-16"></div>
            <hr className="border-black mb-1" />
            <p className="font-semibold text-[11px]">Operator</p>
          </div>
          <div className="text-center w-40">
            <div className="h-16"></div>
            <hr className="border-black mb-1" />
            <p className="font-semibold text-[11px]">Supervisor</p>
          </div>
        </div>
      </div>
    </>
  )
}

