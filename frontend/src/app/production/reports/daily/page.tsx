"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DailyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getDaily().then((res: any) => {
      setData(res.data || res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Daily Production Report</h1>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Log Supply</TableHead>
              <TableHead className="text-right">Trimming</TableHead>
              <TableHead className="text-right">Consumed Input</TableHead>
              <TableHead className="text-right">Sawn Output</TableHead>
              <TableHead className="text-right">Rendement</TableHead>
              <TableHead className="text-right">Chamber IN</TableHead>
              <TableHead className="text-right">Chamber OUT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.date}</TableCell>
                <TableCell className="text-right">{row.logSupply}</TableCell>
                <TableCell className="text-right">{row.trimming}</TableCell>
                <TableCell className="text-right">{row.consumedInput}</TableCell>
                <TableCell className="text-right">{row.sawnOutput}</TableCell>
                <TableCell className="text-right">{row.rendement}%</TableCell>
                <TableCell className="text-right">{row.chamberIn}</TableCell>
                <TableCell className="text-right">{row.chamberOut}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
