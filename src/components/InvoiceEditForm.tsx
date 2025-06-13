"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FetchedStoredInvoiceData } from '@/services/invoiceService';
import { format } from 'date-fns';

interface InvoiceEditFormProps {
  invoice: FetchedStoredInvoiceData;
  onUpdateSuccess: (updatedInvoice: FetchedStoredInvoiceData) => void;
  onCancel: () => void;
}

export function InvoiceEditForm({ invoice, onUpdateSuccess, onCancel }: InvoiceEditFormProps) {
  const [formData, setFormData] = useState({
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: invoice.invoiceDate ? format(invoice.invoiceDate, 'yyyy-MM-dd') : '',
    description: invoice.description || '',
    totalAmount: invoice.totalAmount || 0,
    lineItems: invoice.lineItems || []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalAmount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleLineItemChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updatedLineItems = [...formData.lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: field === 'amount' ? parseFloat(value as string) || 0 : value
    };
    setFormData(prev => ({ ...prev, lineItems: updatedLineItems }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', amount: 0 }]
    }));
  };

  const removeLineItem = (index: number) => {
    const updatedLineItems = formData.lineItems.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, lineItems: updatedLineItems }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const invoiceRef = doc(db, 'invoices', invoice.id);
      
      // Prepare data for update
      const updateData: Record<string, any> = {
        invoiceNumber: formData.invoiceNumber,
        description: formData.description,
        totalAmount: formData.totalAmount,
        lineItems: formData.lineItems,
        updatedAt: serverTimestamp()
      };

      // Handle date conversion
      if (formData.invoiceDate) {
        updateData.invoiceDate = new Date(formData.invoiceDate);
      } else {
        updateData.invoiceDate = null;
      }

      await updateDoc(invoiceRef, updateData);

      // Create updated invoice object for state update
      const updatedInvoice: FetchedStoredInvoiceData = {
        ...invoice,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate) : null,
        description: formData.description,
        totalAmount: formData.totalAmount,
        lineItems: formData.lineItems,
        updatedAt: new Date()
      };

      onUpdateSuccess(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={handleInputChange}
            placeholder="Enter invoice number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice Date</Label>
          <Input
            id="invoiceDate"
            name="invoiceDate"
            type="date"
            value={formData.invoiceDate}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Enter invoice description"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="totalAmount">Total Amount</Label>
        <Input
          id="totalAmount"
          name="totalAmount"
          type="number"
          step="0.01"
          value={formData.totalAmount}
          onChange={handleInputChange}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <Label>Line Items</Label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addLineItem}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                    No line items added
                  </TableCell>
                </TableRow>
              ) : (
                formData.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
