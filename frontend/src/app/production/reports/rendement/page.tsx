"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RendementPage() {
  const [data, setData] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ inputM3: 0, outputM3: 0, overallRendementFormatted: "0%" });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = () => {
    setLoading(true);
    ProductionReportAPI.getRendement({ startDate, endDate }).then((res: any) => {
      setData(res.data || []);
      setTotals(res.totals || { inputM3: 0, outputM3: 0, overallRendementFormatted: "0%" });
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-4 md:p-8">Memuat...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Laporan Rendement</h1>
      
      <div className="flex gap-4 mb-6">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button onClick={fetchData}>Cari</Button>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-10 border rounded">Data tidak tersedia untuk periode ini</div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Mesin</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">Input M³</TableHead>
                <TableHead className="text-right">Output M³</TableHead>
                <TableHead className="text-right">Rendement %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(row.date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{row.shift}</TableCell>
                  <TableCell>{row.machineName}</TableCell>
                  <TableCell>{row.operatorName}</TableCell>
                  <TableCell className="text-right">{row.inputM3.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.outputM3.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.rendementFormatted}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-gray-50">
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right">{totals.inputM3.toFixed(4)}</TableCell>
                <TableCell className="text-right">{totals.outputM3.toFixed(4)}</TableCell>
                <TableCell className="text-right">{totals.overallRendementFormatted}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

