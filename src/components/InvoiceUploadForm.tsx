
"use client";

import type { ChangeEvent } from "react";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, Loader2 } from "lucide-react";
import { extractInvoiceData, type ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import { saveInvoiceMetadata } from '@/services/invoiceService'; // Renamed from saveInitialInvoice
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from '@/config/firebase'; // Import storage
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import Firebase storage functions

interface InvoiceUploadFormProps {
  onExtractionSuccess: (
    data: ExtractInvoiceDataOutput, 
    file: File, 
    saveResult: { id: string; fileDownloadUrl: string; filePath: string; }
  ) => void;
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

// Client-side file upload function
async function uploadInvoiceFileClientSide(file: File, userId: string): Promise<{ downloadURL: string; filePath: string }> {
  const uniqueFileName = `${new Date().getTime()}_${file.name}`;
  const fullStoragePath = `users/${userId}/invoices/${uniqueFileName}`;
  const fileReference = storageRef(storage, fullStoragePath);

  try {
    await uploadBytes(fileReference, file);
    const downloadURL = await getDownloadURL(fileReference);
    return { downloadURL, filePath: fullStoragePath };
  } catch (e) {
    console.error('Error uploading file to Firebase Storage (client-side): ', e);
    if (e instanceof Error) {
      throw new Error(`Client-side upload failed: ${e.message}`);
    }
    throw new Error('Client-side upload failed due to an unknown error.');
  }
}


export function InvoiceUploadForm({ onExtractionSuccess, setGlobalLoading, setGlobalError }: InvoiceUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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

    if (!user || !user.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload an invoice.",
        variant: "destructive",
      });
      setGlobalError("User not authenticated.");
      return;
    }

    setIsProcessing(true);
    setGlobalLoading(true);
    setGlobalError(null);

    try {
      // 1. Upload file client-side
      toast({ title: "Step 1/3: Uploading File...", description: "Please wait while the file is uploaded." });
      const { downloadURL, filePath } = await uploadInvoiceFileClientSide(selectedFile, user.uid);
      toast({ title: "Step 1/3: Upload Successful!", description: `File ${selectedFile.name} uploaded.` });

      // 2. Extract data using Genkit
      toast({ title: "Step 2/3: Extracting Data...", description: "AI is processing the invoice." });
      const invoiceDataUri = await fileToDataUri(selectedFile);
      const extractedDataResponse = await extractInvoiceData({ invoiceDataUri });
      toast({ title: "Step 2/3: Data Extracted!", description: "Invoice content has been parsed." });
      
      // 3. Save metadata to Firestore via server action
      toast({ title: "Step 3/3: Saving Data...", description: "Saving invoice details to the cloud." });
      const firestoreSaveResult = await saveInvoiceMetadata({
        extractedData: extractedDataResponse,
        fileName: selectedFile.name,
        fileDownloadUrl: downloadURL,
        filePath: filePath,
        userId: user.uid
      });
      
      onExtractionSuccess(extractedDataResponse, selectedFile, { id: firestoreSaveResult.id, fileDownloadUrl: downloadURL, filePath: filePath });
      toast({
        title: "Operation Successful",
        description: "Invoice processed and all data saved.",
      });

    } catch (error) {
      console.error("Operation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing, upload, or saving.";
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
        <CardDescription>Upload your invoice (PDF or image) to extract data, store the file, and save details automatically.</CardDescription>
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
          <Button type="submit" disabled={isProcessing || !selectedFile || !user} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Extract, Upload & Save Data
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
