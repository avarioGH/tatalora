"use client";

import { useEffect, useState } from "react";
import { PurchaseAPI } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [purchase, setPurchase] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (params?.id && params.id !== 'undefined') fetchData();
  }, [params?.id]);

  const fetchData = () => {
    PurchaseAPI.getPurchase(params.id).then((res: any) => {
      setPurchase(res?.data || res);
    }).catch((err: any) => setError(err?.response?.data?.message || err.message || "Failed to load data"));
  };

  const handleConfirm = async () => {
    if (!confirm("Are you sure you want to confirm this purchase?")) return;
    try {
      await PurchaseAPI.confirmPurchase(params.id);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Confirmation failed");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this purchase?")) return;
    try {
      await PurchaseAPI.cancelPurchase(params.id);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Cancellation failed");
    }
  };

  if (error) return <div className="p-6 text-red-500 font-semibold text-center">{error}</div>;
  if (!purchase) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase Detail {purchase.code}</h1>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">Supplier:</span> {purchase.source?.name || purchase.sourceId}</div>
          <div><span className="text-gray-500">Warehouse:</span> {purchase.warehouse?.name || purchase.warehouseId}</div>
          <div>
            <span className="text-gray-500">Status: </span>
            <Badge variant={purchase.status === 'CONFIRMED' ? 'default' : purchase.status === 'CANCELLED' ? 'destructive' : 'secondary'}>
              {purchase.status || 'DRAFT'}
            </Badge>
          </div>
          <div className="flex gap-2">
            {(purchase.status === 'DRAFT' || !purchase.status) && (
              <>
                <Button onClick={handleConfirm} size="sm">Confirm</Button>
                <Button onClick={handleCancel} variant="destructive" size="sm">Cancel</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(purchase.items || []).map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{item.product?.name || item.productId}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitPrice}</TableCell>
                  <TableCell>{item.quantity * item.unitPrice}</TableCell>
                </TableRow>
              ))}
              {(!purchase.items || purchase.items.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center">No items.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PHASE 26.1: PURCHASE LOGS SECTION */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Purchase Logs (Raw Logs)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log Number</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Length</TableHead>
                <TableHead>Diameter (1/2/3/4)</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Receiving Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(purchase.logItems || []).map((log: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{log.logNumber}</TableCell>
                  <TableCell>{log.species}</TableCell>
                  <TableCell>{log.purchaseLength}</TableCell>
                  <TableCell>{log.purchaseDiameter1}/{log.purchaseDiameter2}/{log.purchaseDiameter3}/{log.purchaseDiameter4}</TableCell>
                  <TableCell>{log.purchaseVolume}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={log.status === "RECEIVED" ? "default" : "secondary"} className={log.status === "RECEIVED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500" : ""}>
                        {log.status === "RECEIVED" ? "Received" : "Not Received"}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!purchase.logItems || purchase.logItems.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-500">No purchase logs recorded.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


