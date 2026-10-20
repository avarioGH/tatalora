"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { ShipmentAPI } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function PrintShipmentDocument({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    ShipmentAPI.getShipment(id)
      .then((res: any) => {
        setData(res?.data || res);
        setTimeout(() => window.print(), 800);
      })
      .catch((err: any) => {
        console.error(err);
        setError(true);
      });
  }, [id]);

  if (error) {
    return <div className="p-12 text-center text-red-600 font-bold">Dokumen tidak dapat dimuat. Terjadi kesalahan.</div>;
  }

  if (!data) {
    return (
      <div className="p-12 flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fusoTitle = data.fusoName || data.shipmentNumber || data.code || "FUSO";
  const sNum = data.shipmentNumber || data.code || "-";
  const plate = data.policeNumber || data.vehicle?.licensePlate || data.vehicle?.name || "-";
  const driver = data.driverName || data.driver?.name || "-";
  const totalPcs = data.totalPcs || (data.items || []).reduce((sum: number, i: any) => sum + (i.quantityPcs || 0), 0);
  const totalM3 = data.totalVolumeM3 || (data.items || []).reduce((sum: number, i: any) => sum + (i.volumeM3 || 0), 0);

  let mrtM3 = 0, bkrM3 = 0, balokM3 = 0, rengM3 = 0;
  (data.items || []).forEach((item: any) => {
    const vol = item.volumeM3 || 0;
    const spec = (item.species || item.timberVariant?.species || "").toUpperCase();
    const cat = (item.productCategory || "BALOK").toUpperCase();

    if (spec.includes("BENGKIRAI") || spec.includes("BKR")) bkrM3 += vol;
    else mrtM3 += vol;

    if (cat.includes("RENG") || cat.includes("PAPAN") || cat === "LOKAL") rengM3 += vol;
    else balokM3 += vol;
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 24px; box-sizing: border-box; }
          @page { size: A4 portrait; margin: 1cm; }
        }
      `}} />

      <div id="print-section" className="max-w-[210mm] mx-auto bg-white text-black font-sans text-[12px] leading-relaxed p-6">
        {/* Header */}
        <div className="border-b-2 border-black pb-3 mb-5 text-center">
          <h1 className="text-lg font-black uppercase tracking-widest">SURAT TALLY MUATAN ARMADA FUSO</h1>
          <p className="text-[11px] text-gray-700 tracking-wide mt-0.5">EKSPEDISI PENGIRIMAN KAYU GERGAJIAN (SAWN TIMBER)</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 mb-5 text-[11.5px]">
          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-32 font-bold">No. Surat Muat</span>
              <span className="font-bold">: {sNum}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold">Armada / Truk</span>
              <span className="font-bold text-black">: {fusoTitle}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">No. Polisi Kendaraan</span>
              <span>: {plate}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Nama Supir</span>
              <span>: {driver}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex">
              <span className="w-32 font-semibold">Tanggal Muat</span>
              <span>: {data.shipmentDate ? new Date(data.shipmentDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Gudang Asal</span>
              <span>: {data.warehouse?.name || data.warehouseId || "-"}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold">Tujuan / Pembeli</span>
              <span className="font-bold">: {data.destinationName || data.customer?.name || "-"}</span>
            </div>
            {data.notes && (
              <div className="flex">
                <span className="w-32 font-semibold">Keterangan</span>
                <span>: {data.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <h2 className="font-bold text-[12px] uppercase mb-2 border-b border-black pb-1">Rincian Ukuran Kayu Dimuat</h2>
        <table className="w-full border-collapse border border-black mb-5 text-[11px]">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-black p-1.5 text-center w-10">NO</th>
              <th className="border border-black p-1.5 text-left w-32">JENIS KAYU</th>
              <th className="border border-black p-1.5 text-left w-28">KATEGORI</th>
              <th className="border border-black p-1.5 text-center" colSpan={3}>UKURAN (CM)</th>
              <th className="border border-black p-1.5 text-right w-20">PCS</th>
              <th className="border border-black p-1.5 text-right w-24">VOLUME (M³)</th>
            </tr>
            <tr className="bg-gray-50 text-[10px]">
              <th className="border border-black p-1 text-center" colSpan={3}></th>
              <th className="border border-black p-1 text-center w-14">T</th>
              <th className="border border-black p-1 text-center w-14">L</th>
              <th className="border border-black p-1 text-center w-14">P</th>
              <th className="border border-black p-1 text-center" colSpan={2}></th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item: any, i: number) => {
              const t = item.thicknessMm ? item.thicknessMm / 10 : (item.timberVariant?.thickness || 0) / 10;
              const l = item.widthMm ? item.widthMm / 10 : (item.timberVariant?.width || 0) / 10;
              const p = item.lengthMm ? item.lengthMm / 10 : (item.timberVariant?.length || 0) / 10;
              const species = item.species || item.timberVariant?.species || "MERANTI";
              const cat = item.productCategory || "BALOK";
              const pcs = item.quantityPcs || item.quantity || 0;
              const m3 = item.volumeM3 || 0;

              return (
                <tr key={item.id || i}>
                  <td className="border border-black p-1.5 text-center">{i + 1}</td>
                  <td className="border border-black p-1.5 font-medium">{species}</td>
                  <td className="border border-black p-1.5">{cat === 'RENG' ? 'Reng / Papan' : cat === 'AFKIR_BS' ? 'BS / Afkir' : 'Balok / Main'}</td>
                  <td className="border border-black p-1.5 text-center">{t || "-"}</td>
                  <td className="border border-black p-1.5 text-center">{l || "-"}</td>
                  <td className="border border-black p-1.5 text-center">{p || "-"}</td>
                  <td className="border border-black p-1.5 text-right font-bold">{pcs}</td>
                  <td className="border border-black p-1.5 text-right font-bold">{Number(m3.toFixed(4))}</td>
                </tr>
              );
            })}
            {(!data.items || data.items.length === 0) && (
              <tr>
                <td colSpan={8} className="border border-black p-4 text-center italic">Tidak ada item muatan</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={6} className="border border-black p-2 text-right uppercase">TOTAL MUATAN:</td>
              <td className="border border-black p-2 text-right">{totalPcs.toLocaleString("id-ID")}</td>
              <td className="border border-black p-2 text-right">{Number(totalM3.toFixed(4))}</td>
            </tr>
          </tfoot>
        </table>

        {/* Ringkasan Subtotal */}
        <div className="border border-black p-3 mb-8 bg-gray-50 text-[11px]">
          <div className="font-bold uppercase mb-1 border-b border-gray-300 pb-1">REKAPITULASI MUATAN ARMADA:</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>• Meranti: <strong>{Number(mrtM3.toFixed(4))} m³</strong></p>
              <p>• Bengkirai: <strong>{Number(bkrM3.toFixed(4))} m³</strong></p>
            </div>
            <div>
              <p>• Balok / Main Size: <strong>{Number(balokM3.toFixed(4))} m³</strong></p>
              <p>• Reng / Papan: <strong>{Number(rengM3.toFixed(4))} m³</strong></p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-4 gap-4 text-center mt-12 text-[11px]">
          <div>
            <p className="font-semibold mb-16">Mandor Muat (Checker)</p>
            <hr className="border-black mb-1 w-32 mx-auto" />
            <p>( ........................... )</p>
          </div>
          <div>
            <p className="font-semibold mb-16">Supir Armada (Driver)</p>
            <hr className="border-black mb-1 w-32 mx-auto" />
            <p>( {driver || "..........................."} )</p>
          </div>
          <div>
            <p className="font-semibold mb-16">Kepala Gudang</p>
            <hr className="border-black mb-1 w-32 mx-auto" />
            <p>( ........................... )</p>
          </div>
          <div>
            <p className="font-semibold mb-16">Penerima (Buyer)</p>
            <hr className="border-black mb-1 w-32 mx-auto" />
            <p>( ........................... )</p>
          </div>
        </div>
      </div>
    </>
  );
}
