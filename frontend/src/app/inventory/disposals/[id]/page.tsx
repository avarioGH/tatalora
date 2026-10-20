'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DisposalAPI } from '@/lib/api';

export default function DisposalDetailPage({ params }: { params: { id: string } }) {
  const [disposal, setDisposal] = useState<any>(null);

  useEffect(() => {
    DisposalAPI.getById(params.id).then(setDisposal).catch(console.error);
  }, [params.id]);

  const handleReverse = async () => {
    try {
      await DisposalAPI.reverse(params.id);
      const updated = await DisposalAPI.getById(params.id);
      setDisposal(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!disposal) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          aside, nav, .sidebar { display: none !important; }
          .no-print { display: none !important; }
        }
      `}} />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Disposal Detail: {disposal.id}</h1>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={handlePrint}>Print</Button>
          {disposal.status === 'APPROVED' && (
            <Button variant="destructive" onClick={handleReverse}>Reverse</Button>
          )}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Disposal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{disposal.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{disposal.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reason</p>
              <p className="font-medium">{disposal.reason}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Item ID</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {disposal.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{item.itemId}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2">
                    {item.cost ? item.cost : (disposal.total_cost ? disposal.total_cost : "Cost available in Journal")}
                  </td>
                </tr>
              ))}
              {!disposal.items?.length && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">No items found</td>
                </tr>
              )}
            </tbody>
            {disposal.items?.length > 0 && (
              <tfoot>
                <tr className="font-bold border-t">
                  <td className="py-2" colSpan={2}>Total FIFO Cost</td>
                  <td className="py-2">
                    {disposal.total_cost ? disposal.total_cost : "Cost available in Journal"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
