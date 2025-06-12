
"use client";

import type { ChangeEvent } from "react";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, Loader2 } from "lucide-react";
import { extractInvoiceData, type ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { storage, db } from '@/config/firebase'; 
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { collection, addDoc, serverTimestamp, type FieldValue } from 'firebase/firestore';
import type { StoredInvoiceData } from '@/services/invoiceService';

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

async function uploadInvoiceFileClientSide(file: File, userId: string): Promise<{ downloadURL: string; filePath: string }> {
  console.log('[InvoiceUploadForm] Starting client-side file upload for user:', userId, 'File:', file.name);
  const uniqueFileName = `${new Date().getTime()}_${file.name}`;
  const fullStoragePath = `users/${userId}/invoices/${uniqueFileName}`;
  const fileReference = storageRef(storage, fullStoragePath);

  try {
    await uploadBytes(fileReference, file);
    console.log('[InvoiceUploadForm] File uploaded to Firebase Storage. Path:', fullStoragePath);
    const downloadURL = await getDownloadURL(fileReference);
    console.log('[InvoiceUploadForm] Got download URL:', downloadURL);
    return { downloadURL, filePath: fullStoragePath };
  } catch (e) {
    console.error('[InvoiceUploadForm] Error uploading file to Firebase Storage (client-side): ', e);
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
      console.error('[InvoiceUploadForm] User not authenticated for upload.');
      return;
    }
    console.log('[InvoiceUploadForm] User authenticated:', user.uid);

    setIsProcessing(true);
    setGlobalLoading(true);
    setGlobalError(null);

    let uploadResult;
    let extractedDataResponse;

    try {
      // 1. Upload file client-side
      console.log('[InvoiceUploadForm] Step 1/3: Starting file upload...');
      toast({ title: "Step 1/3: Uploading File...", description: "Please wait while the file is uploaded." });
      uploadResult = await uploadInvoiceFileClientSide(selectedFile, user.uid);
      toast({ title: "Step 1/3: Upload Successful!", description: `File ${selectedFile.name} uploaded.` });
      console.log('[InvoiceUploadForm] Step 1/3: File upload successful. Result:', uploadResult);

      // 2. Extract data using Genkit
      console.log('[InvoiceUploadForm] Step 2/3: Starting data extraction with AI...');
      toast({ title: "Step 2/3: Extracting Data with AI...", description: "AI is processing the invoice. This may take a moment." });
      const invoiceDataUri = await fileToDataUri(selectedFile);
      extractedDataResponse = await extractInvoiceData({ invoiceDataUri });
      toast({ title: "Step 2/3: AI Data Extracted!", description: "Invoice content has been parsed." });
      console.log('[InvoiceUploadForm] Step 2/3: Data extraction successful. Response:', JSON.stringify(extractedDataResponse, null, 2));
      
      // 3. Save metadata to Firestore (Client-Side)
      console.log('[InvoiceUploadForm] Step 3/3: Preparing to save metadata to Firestore (client-side)...');
      toast({ title: "Step 3/3: Saving Data...", description: "Saving invoice details to the cloud." });
      
      const docDataToSave: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt?: FieldValue; updatedAt?: FieldValue } = {
        userId: user.uid,
        fileName: selectedFile.name,
        fileDownloadUrl: uploadResult.downloadURL,
        filePath: uploadResult.filePath,
      };
      
      // Conditionally add optional fields from extractedDataResponse to prevent Firestore errors with 'undefined'
      if (extractedDataResponse.invoiceNumber !== undefined) {
        docDataToSave.invoiceNumber = extractedDataResponse.invoiceNumber;
      }
      if (extractedDataResponse.invoiceDate !== undefined) {
        docDataToSave.invoiceDate = extractedDataResponse.invoiceDate;
      }
      if (extractedDataResponse.lineItems !== undefined && Array.isArray(extractedDataResponse.lineItems)) {
        // Ensure lineItems are clean (e.g., no undefined amounts/descriptions if schema allows)
        docDataToSave.lineItems = extractedDataResponse.lineItems.map(item => ({
            description: item.description ?? "", // Default to empty string if undefined
            amount: item.amount ?? 0, // Default to 0 if undefined
        }));
      } else {
        docDataToSave.lineItems = []; // Default to empty array if not present or not an array
      }
      if (extractedDataResponse.totalAmount !== undefined) {
        docDataToSave.totalAmount = extractedDataResponse.totalAmount;
      }
      
      const finalDocData = {
        ...docDataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      console.log('[InvoiceUploadForm] Firestore DB instance to be used:', db);
      console.log('[InvoiceUploadForm] Document data to be saved to Firestore (client-side):', JSON.stringify(finalDocData, null, 2));

      try {
        const docRef = await addDoc(collection(db, "invoices"), finalDocData);
        console.log("[InvoiceUploadForm] Step 3/3: Firestore save successful (client-side). Document ID:", docRef.id);
        
        onExtractionSuccess(extractedDataResponse, selectedFile, { id: docRef.id, fileDownloadUrl: uploadResult.downloadURL, filePath: uploadResult.filePath });
        toast({
          title: "Operation Successful",
          description: "Invoice processed and all data saved.",
        });
        console.log('[InvoiceUploadForm] Operation fully successful (client-side Firestore). Firestore ID:', docRef.id);
      } catch (saveError: any) {
        console.error("[InvoiceUploadForm] Error during Step 3/3 (Saving to Firestore client-side):", saveError);
        console.error("[InvoiceUploadForm] Firestore Save Error Code:", saveError.code);
        console.error("[InvoiceUploadForm] Firestore Save Error Message:", saveError.message);
        const saveErrorMessage = saveError.message || "An unknown error occurred while saving to Firestore.";
        setGlobalError(`Saving to Firestore failed: ${saveErrorMessage}`);
        toast({
          title: "Saving Data Failed (Client-Side)",
          description: `Could not save invoice details to Firestore: ${saveErrorMessage}`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("[InvoiceUploadForm] Operation failed in main try block:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing, upload, or saving.";
      
      let toastTitle = "Operation Failed";
      let toastDescription = errorMessage;

      if (String(errorMessage).toLowerCase().includes("gateway timeout") || String(errorMessage).toLowerCase().includes("504") || String(errorMessage).toLowerCase().includes("deadline exceeded")) {
        toastTitle = "AI Processing Timeout";
        toastDescription = "The AI model took too long to process the invoice. Please try a smaller file or try again later.";
      } else if (String(errorMessage).includes("extractInvoiceData")) {
        toastTitle = "Data Extraction Failed";
        toastDescription = `AI processing failed: ${errorMessage}`;
      } else if (String(errorMessage).includes("uploadInvoiceFileClientSide") || String(errorMessage).includes("Client-side upload failed")) {
        toastTitle = "File Upload Failed";
        toastDescription = `Could not upload file: ${errorMessage}`;
      }
      
      if (!String(errorMessage).includes("Saving to Firestore failed")) {
         setGlobalError(`Operation failed: ${toastDescription}`);
      }
      
      if (!toastTitle.includes("Saving Data Failed")) { // Avoid double toast if Firestore save itself failed
        toast({
            title: toastTitle,
            description: toastDescription,
            variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
      setGlobalLoading(false);
      console.log('[InvoiceUploadForm] Processing finished.');
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

