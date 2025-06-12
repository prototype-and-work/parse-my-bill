
"use client";

import type { ChangeEvent } from "react";
import { useState, useEffect } from 'react';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import { updateInvoiceInFirestore } from '@/services/invoiceService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, CalendarDays, CircleDollarSign, Save, FileJson2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface InvoiceDataDisplayProps {
  initialData: ExtractInvoiceDataOutput;
  onDataUpdate: (updatedData: ExtractInvoiceDataOutput) => void;
  uploadedFileName?: string;
  firestoreDocumentId: string | null;
  fileDownloadUrl?: string;
}

export function InvoiceDataDisplay({ initialData, onDataUpdate, uploadedFileName, firestoreDocumentId, fileDownloadUrl }: InvoiceDataDisplayProps) {
  const [editableData, setEditableData] = useState<ExtractInvoiceDataOutput>(initialData);
  const { toast } = useToast();

  useEffect(() => {
    setEditableData(initialData);
  }, [initialData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableData(prev => ({
      ...prev,
      [name]: name === 'totalAmount' ? parseFloat(value) || 0 : value,
    }));
  };
  
  const handleLineItemChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updatedLineItems = [...editableData.lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: field === 'amount' ? parseFloat(value as string) || 0 : value,
    };
    setEditableData(prev => ({ ...prev, lineItems: updatedLineItems }));
  };


  const handleSaveChanges = async () => {
    if (!firestoreDocumentId) {
      toast({
        title: "Error",
        description: "No Document ID found. Cannot save changes to Firestore.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateInvoiceInFirestore(firestoreDocumentId, editableData);
      onDataUpdate(editableData);
      toast({
        title: "Data Updated & Saved",
        description: "Invoice details have been updated and saved to Firestore.",
      });
    } catch (error) {
      console.error("Failed to save changes to Firestore:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Save Failed",
        description: `Could not save changes to Firestore: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Extracted Invoice Data</CardTitle>
        {uploadedFileName && (
          <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span>Showing data for: {uploadedFileName}</span>
            {fileDownloadUrl && (
              <a
                href={fileDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-1 sm:mt-0 flex items-center"
              >
                View Uploaded File <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 font-headline flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Invoice Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                value={editableData.invoiceNumber}
                onChange={handleInputChange}
                className="bg-background/70"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
               <Input
                id="invoiceDate"
                name="invoiceDate"
                value={editableData.invoiceDate}
                onChange={handleInputChange}
                className="bg-background/70"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input
                id="totalAmount"
                name="totalAmount"
                type="number"
                value={editableData.totalAmount}
                onChange={handleInputChange}
                className="bg-background/70"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 font-headline flex items-center">
            <CircleDollarSign className="mr-2 h-5 w-5 text-primary" />
            Line Items
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editableData.lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                       <Textarea
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        className="bg-background/70 min-h-[40px] p-1 text-sm"
                        rows={1}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                        className="bg-background/70 text-right p-1 text-sm h-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                 {editableData.lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No line items extracted.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold font-headline hover:no-underline">
                <div className="flex items-center">
                    <FileJson2 className="mr-2 h-5 w-5 text-primary" /> Raw JSON Data
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted/50 p-4 rounded-md max-h-96 overflow-auto">
                <pre className="text-sm font-code whitespace-pre-wrap break-all">
                  {JSON.stringify(editableData, null, 2)}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveChanges} className="w-full md:w-auto ml-auto bg-primary text-primary-foreground hover:bg-primary/90" disabled={!firestoreDocumentId}>
          <Save className="mr-2 h-4 w-4" />
          Update & Save to Cloud
        </Button>
      </CardFooter>
    </Card>
  );
}

