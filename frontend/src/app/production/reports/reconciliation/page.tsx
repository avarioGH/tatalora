"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ReconciliationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getReconciliation().then((res: any) => {
      setData(res.data || res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reconciliation Report</h1>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Prod PCS</TableHead>
              <TableHead className="text-right">Prod M³</TableHead>
              <TableHead className="text-right">Inv PCS</TableHead>
              <TableHead className="text-right">Inv M³</TableHead>
              <TableHead className="text-right">Diff PCS</TableHead>
              <TableHead className="text-right">Diff M³</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.variant}</TableCell>
                <TableCell className="text-right">{row.prodPcs}</TableCell>
                <TableCell className="text-right">{row.prodM3}</TableCell>
                <TableCell className="text-right">{row.invPcs}</TableCell>
                <TableCell className="text-right">{row.invM3}</TableCell>
                <TableCell className="text-right">{row.diffPcs}</TableCell>
                <TableCell className="text-right">{row.diffM3}</TableCell>
                <TableCell>
                  {row.status === "MATCH" ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">MATCH</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">MISMATCH</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
