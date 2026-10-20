"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ChamberPage() {
  const [data, setData] = useState<any>({ stocks: [], movements: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getChamber().then((res: any) => {
      setData(res.data || res || { stocks: [], movements: [] });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Current Chamber Stock</h2>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chamber</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">PCS</TableHead>
                <TableHead className="text-right">M³</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.stocks || []).map((row: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{row.chamber}</TableCell>
                  <TableCell>{row.variant}</TableCell>
                  <TableCell className="text-right">{row.pcs}</TableCell>
                  <TableCell className="text-right">{row.m3}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Chamber Movement</h2>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transfer No</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">PCS</TableHead>
                <TableHead className="text-right">M³</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.movements || []).map((row: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.transferNo}</TableCell>
                  <TableCell>{row.direction}</TableCell>
                  <TableCell>{row.from}</TableCell>
                  <TableCell>{row.to}</TableCell>
                  <TableCell>{row.variant}</TableCell>
                  <TableCell className="text-right">{row.pcs}</TableCell>
                  <TableCell className="text-right">{row.m3}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
