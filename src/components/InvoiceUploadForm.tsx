
"use client";

import type { ChangeEvent } from "react";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, Loader2 } from "lucide-react";
import { extractInvoiceData, type ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import { saveInitialInvoice } from '@/services/invoiceService';
import { useToast } from "@/hooks/use-toast";

interface InvoiceUploadFormProps {
  onExtractionSuccess: (data: ExtractInvoiceDataOutput, file: File, documentId: string) => void;
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
}

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export function InvoiceUploadForm({ onExtractionSuccess, setGlobalLoading, setGlobalError }: InvoiceUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setGlobalError(null); 
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an invoice file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setGlobalLoading(true);
    setGlobalError(null);

    try {
      const invoiceDataUri = await fileToDataUri(selectedFile);
      const extractedDataResponse = await extractInvoiceData({ invoiceDataUri });
      
      const documentId = await saveInitialInvoice(extractedDataResponse, selectedFile.name);
      
      onExtractionSuccess(extractedDataResponse, selectedFile, documentId);
      toast({
        title: "Extraction & Save Successful",
        description: "Invoice data extracted and saved to Firestore.",
      });
    } catch (error) {
      console.error("Operation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing or saving.";
      setGlobalError(`Operation failed: ${errorMessage}`);
      toast({
        title: "Operation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setGlobalLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Upload Invoice</CardTitle>
        <CardDescription>Upload your invoice (PDF or image) to extract and save data automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invoice-file" className="text-sm font-medium">Invoice File</Label>
            <Input
              id="invoice-file"
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="file:text-foreground"
              aria-describedby="file-help-text"
            />
            <p id="file-help-text" className="text-xs text-muted-foreground">
              Supported formats: PDF, PNG, JPG, GIF. Max file size: 10MB.
            </p>
          </div>
          <Button type="submit" disabled={isProcessing || !selectedFile} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing & Saving...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Extract & Save Data
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
