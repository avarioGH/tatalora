"use client";
import React, { useState, useEffect } from "react";
import { ProductionReportAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DataQualityPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProductionReportAPI.getDataQuality().then((res: any) => {
      setData(res.data || res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Data Quality Report</h1>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Ref ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.type}</TableCell>
                <TableCell>
                  {row.severity === "High" ? (
                    <Badge variant="destructive">{row.severity}</Badge>
                  ) : row.severity === "Medium" ? (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">{row.severity}</Badge>
                  ) : (
                    <Badge variant="secondary">{row.severity}</Badge>
                  )}
                </TableCell>
                <TableCell>{row.message}</TableCell>
                <TableCell className="font-mono text-sm">{row.refId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
