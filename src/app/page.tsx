
"use client";

import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { InvoiceUploadForm } from '@/components/InvoiceUploadForm';
import { InvoiceDataDisplay } from '@/components/InvoiceDataDisplay';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractInvoiceDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firestoreDocumentId, setFirestoreDocumentId] = useState<string | null>(null);

  const handleExtractionSuccess = (data: ExtractInvoiceDataOutput, file: File, documentId: string) => {
    setExtractedData(data);
    setUploadedFile(file);
    setFirestoreDocumentId(documentId);
    setError(null);
  };

  const handleDataUpdate = (updatedData: ExtractInvoiceDataOutput) => {
    setExtractedData(updatedData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
        <InvoiceUploadForm
          onExtractionSuccess={handleExtractionSuccess}
          setGlobalLoading={setIsLoading}
          setGlobalError={setError}
        />

        {isLoading && (
          <Card className="shadow-md animate-pulse">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Processing Invoice</CardTitle>
              <CardDescription>AI is extracting data and saving to cloud, please wait...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-40">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="mt-4 text-muted-foreground">Processing...</p>
            </CardContent>
          </Card>
        )}

        {error && !isLoading && (
          <Alert variant="destructive" className="shadow-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {extractedData && firestoreDocumentId && !isLoading && !error && (
          <InvoiceDataDisplay
            initialData={extractedData}
            onDataUpdate={handleDataUpdate}
            uploadedFileName={uploadedFile?.name}
            firestoreDocumentId={firestoreDocumentId}
          />
        )}

        {!isLoading && !error && !extractedData && (
           <Card className="shadow-md border-dashed border-2">
            <CardContent className="p-10 text-center">
              <img src="https://placehold.co/300x200.png?text=Invoice+Illustration" alt="Invoice placeholder" data-ai-hint="invoice document" className="mx-auto mb-6 rounded-md opacity-70" />
              <h3 className="text-xl font-semibold text-muted-foreground font-headline">Ready to Parse</h3>
              <p className="text-muted-foreground mt-2">
                Upload an invoice to get started. The extracted data will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ParseMyBill. All rights reserved.</p>
        <p className="text-xs mt-1">Data is saved to Cloud Firestore. File uploads to cloud storage are not implemented in this demo.</p>
      </footer>
    </div>
  );
}
