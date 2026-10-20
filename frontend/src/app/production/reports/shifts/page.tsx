"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ShiftsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getShifts().then((res: any) => {
      setData(res.data || res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Shifts Performance</h1>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shift</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead className="text-right">Production Runs</TableHead>
              <TableHead className="text-right">Input M³</TableHead>
              <TableHead className="text-right">Output PCS</TableHead>
              <TableHead className="text-right">Output M³</TableHead>
              <TableHead className="text-right">Rendement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.shift}</TableCell>
                <TableCell>{row.operator}</TableCell>
                <TableCell>{row.machine}</TableCell>
                <TableCell className="text-right">{row.runs}</TableCell>
                <TableCell className="text-right">{row.inputM3}</TableCell>
                <TableCell className="text-right">{row.outputPcs}</TableCell>
                <TableCell className="text-right">{row.outputM3}</TableCell>
                <TableCell className="text-right">{row.rendement}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
