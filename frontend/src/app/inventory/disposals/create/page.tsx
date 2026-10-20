'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { DisposalAPI } from '@/lib/api';

export default function CreateDisposalPage() {
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const router = useRouter();

  const handleAddItem = () => {
    setItems([...items, { itemId: '', quantity: 1 }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await DisposalAPI.create({ reason, items });
      router.push('/inventory/disposals');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create Disposal</h1>
      <Card>
        <CardHeader>
          <CardTitle>Disposal Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Reason</label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for disposal" required />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Items</label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>Add Item</Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Item ID" 
                    value={item.itemId}
                    onChange={e => {
                      const newItems = [...items];
                      newItems[index].itemId = e.target.value;
                      setItems(newItems);
                    }}
                    required 
                  />
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...items];
                      newItems[index].quantity = parseInt(e.target.value) || 1;
                      setItems(newItems);
                    }}
                    required 
                  />
                </div>
              ))}
              {items.length > 0 && (
                <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                  Estimated Cost: Akan dihitung berdasarkan FIFO saat diposting
                </div>
              )}
            </div>

            <Button type="submit" className="mt-4">Submit</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
