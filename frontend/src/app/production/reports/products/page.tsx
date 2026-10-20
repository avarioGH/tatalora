"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProductsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getProducts().then((res: any) => {
      setData(res.data || res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Products Output Report</h1>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Yield PCS</TableHead>
              <TableHead className="text-right">Yield M³</TableHead>
              <TableHead className="text-right">% of Total Output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.product}</TableCell>
                <TableCell>{row.variant}</TableCell>
                <TableCell>{row.size}</TableCell>
                <TableCell className="text-right">{row.pcs}</TableCell>
                <TableCell className="text-right">{row.m3}</TableCell>
                <TableCell className="text-right">{row.percentage}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
