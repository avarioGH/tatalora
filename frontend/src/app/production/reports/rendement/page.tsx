"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RendementPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getRendement().then((res: any) => {
      setData(res.data || res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totals = data.reduce((acc, row) => ({
    inputM3: acc.inputM3 + (Number(row.inputM3) || 0),
    outputM3: acc.outputM3 + (Number(row.outputM3) || 0)
  }), { inputM3: 0, outputM3: 0 });
  const overallRendement = totals.inputM3 > 0 ? ((totals.outputM3 / totals.inputM3) * 100).toFixed(2) : 0;

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rendement Report</h1>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead className="text-right">Input M³</TableHead>
              <TableHead className="text-right">Output M³</TableHead>
              <TableHead className="text-right">Rendement %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.shift}</TableCell>
                <TableCell>{row.machine}</TableCell>
                <TableCell>{row.operator}</TableCell>
                <TableCell className="text-right">{row.inputM3}</TableCell>
                <TableCell className="text-right">{row.outputM3}</TableCell>
                <TableCell className="text-right">{row.rendement}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell colSpan={4}>Totals</TableCell>
              <TableCell className="text-right">{totals.inputM3.toFixed(4)}</TableCell>
              <TableCell className="text-right">{totals.outputM3.toFixed(4)}</TableCell>
              <TableCell className="text-right">{overallRendement}%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
