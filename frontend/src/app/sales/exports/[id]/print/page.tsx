"use client"
import { useState, useEffect, use } from "react"
import { exportShipment } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PrintExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    exportShipment.getOne(id).then(res => setData(res?.data || res || null))
  }, [id])

  if (!data) return <div className="p-10 text-center">Loading document...</div>

  // Group items by groupName safely
  const groupedItems = (data.items || []).reduce((acc: any, item: any) => {
    const gName = (item.groupName || "-").trim().toUpperCase();
    if (!acc[gName]) acc[gName] = [];
    acc[gName].push(item);
    return acc;
  }, {});

  let grandTotalKg = 0
  let grandTotalMc = 0
  let grandTotalSak = 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white font-sans text-black">
      {/* Hide controls when printing */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-between print:hidden">
        <Button variant="outline" onClick={() => router.push('/sales/exports')}><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
        <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print Document</Button>
      </div>

      {/* A4 Page Container */}
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg print:shadow-none print:p-4 min-h-[297mm] text-sm relative">
        <h1 className="text-center text-xl font-bold mb-8">DAFTAR BARANG EKSPORT</h1>

        <div className="grid grid-cols-2 mb-6 text-sm font-semibold">
          <div>
            <div className="flex"><span className="w-32">No. CONTAINER</span><span>: {data.containerNo}</span></div>
            <div className="flex"><span className="w-32">No. SEAL</span><span>: {data.sealNo}</span></div>
            <div className="flex"><span className="w-32">No. KENDARAAN</span><span>: {data.vehicleNo}</span></div>
          </div>
          <div className="text-right">
            <div>KONTAINER 83</div>
            <div className="mt-4">{data.exportDate ? new Date(data.exportDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : ''}</div>
          </div>
        </div>

        {Object.keys(groupedItems).map((group, gIdx) => {
          const groupColor = gIdx === 0 ? "bg-[#bfe3b4]" : (gIdx === 1 ? "bg-[#e5d59a]" : "bg-[#dbcca0]")
          const headerColor = gIdx === 0 ? "bg-[#9ccb8f]" : (gIdx === 1 ? "bg-[#dec678]" : "bg-[#c7b585]")
          const items = groupedItems[group]
          
          let totalKg = 0; let totalMc = 0; let totalSak = 0;
          items.forEach((i: any) => { totalKg+=i.qtyKg; totalMc+=i.qtyMc; totalSak+=i.qtySak; })
          
          grandTotalKg += totalKg
          grandTotalMc += totalMc
          grandTotalSak += totalSak

          return (
            <div key={group} className="mb-6">
              <h3 className="font-bold uppercase mb-1">{group}</h3>
              <table className="w-full border-collapse border border-black text-xs text-center">
                <thead>
                  <tr className={`${groupColor} border border-black`}>
                    <th rowSpan={2} className="border border-black w-10 p-1">NO</th>
                    <th rowSpan={2} className="border border-black p-1">NAMA BARANG</th>
                    <th colSpan={3} className="border border-black p-1">JUMLAH</th>
                  </tr>
                  <tr className={`${groupColor} border border-black`}>
                    <th className="border border-black w-20 p-1">KG</th>
                    <th className="border border-black w-16 p-1">MC</th>
                    <th className="border border-black w-24 p-1">{gIdx === 2 ? "KARUNG" : "SAK"}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => (
                    <tr key={item.id} className="border border-black">
                      <td className="border border-black p-1">{idx + 1}</td>
                      <td className="border border-black p-1 text-left px-2">{item.productName}</td>
                      <td className="border border-black p-1">{item.qtyKg || ""}</td>
                      <td className="border border-black p-1">{item.qtyMc || ""}</td>
                      <td className="border border-black p-1">{item.qtySak || ""}</td>
                    </tr>
                  ))}
                  <tr className={`${groupColor} font-bold border border-black`}>
                    <td colSpan={2} className="border border-black p-1">{gIdx === 1 ? "JUMLAH" : "TOTAL"}</td>
                    <td className="border border-black p-1">{totalKg}</td>
                    <td className="border border-black p-1">{totalMc}</td>
                    <td className="border border-black p-1">{totalSak || ""}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}

        <div className="mt-8 text-center font-bold text-sm">
          <div className="grid grid-cols-2 max-w-sm mx-auto">
            <div className="text-right pr-4">GRAND TOTAL :</div>
            <div className="text-left">{grandTotalKg} KG</div>
            <div></div>
            <div className="text-left mt-1">{grandTotalMc} MC</div>
            <div></div>
            <div className="text-left mt-1">{grandTotalSak} KARUNG</div>
          </div>
        </div>

      </div>
    </div>
  )
}
