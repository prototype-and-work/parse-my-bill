
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { InvoiceUploadForm } from '@/components/InvoiceUploadForm';
import { InvoiceDataDisplay } from '@/components/InvoiceDataDisplay';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ReceiptText } from 'lucide-react';
import { db } from '@/config/firebase';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractInvoiceDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [firestoreDocumentId, setFirestoreDocumentId] = useState<string | null>(null);
  const [fileDownloadUrl, setFileDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleExtractionSuccess = (
    data: ExtractInvoiceDataOutput, 
    file: File, 
    saveResult: { id: string; fileDownloadUrl: string; filePath: string; }
  ) => {
    setExtractedData(data); 
    setUploadedFile(file);
    setFirestoreDocumentId(saveResult.id);
    setFileDownloadUrl(saveResult.fileDownloadUrl);
    setError(null);
  };

  const handleDataUpdate = (updatedData: ExtractInvoiceDataOutput) => {
    setExtractedData(updatedData); 
  };

  if (authLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">
                {authLoading ? "Authenticating..." : "Redirecting..."}
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-grow px-6 py-6 bg-slate-50 space-y-6">
        <div className="mb-6">
            <h1 className="text-2xl font-headline font-semibold text-slate-800">Scan Invoice</h1>
            <p className="text-slate-600 text-sm">Upload an invoice to get started. The extracted data and file link will appear here.</p>
          </div>
        <InvoiceUploadForm
          onExtractionSuccess={handleExtractionSuccess}
          setGlobalLoading={setIsLoading}
          setGlobalError={setError}
        />

        {isLoading && (
          <Card className="shadow-sm border border-slate-200 bg-white animate-pulse">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-slate-700">Processing Invoice</CardTitle>
              <CardDescription className="text-slate-500">Uploading file, AI extracting data, and saving to cloud. Please wait...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-40">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="mt-4 text-slate-500">Processing...</p>
            </CardContent>
          </Card>
        )}

        {error && !isLoading && (
          <Alert variant="destructive" className="shadow-sm border border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-700 font-medium">Error</AlertTitle>
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        {extractedData && firestoreDocumentId && !isLoading && !error && (
          <InvoiceDataDisplay
            initialData={extractedData} 
            onDataUpdate={handleDataUpdate}
            uploadedFileName={uploadedFile?.name}
            firestoreDocumentId={firestoreDocumentId}
            fileDownloadUrl={fileDownloadUrl ?? undefined}
          />
        )}

        {!isLoading && !error && !extractedData && (
           <Card className="shadow-sm border border-slate-200 bg-white">
            <CardContent className="p-10 text-center">
              <div className="flex justify-center mb-4">
                <ReceiptText className="h-16 w-16 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-700">Ready to Parse</h3>
              <p className="text-slate-500 text-sm mt-1">
                Upload an invoice to get started. The extracted data and file link will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
        <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-200">
          <p>&copy; {new Date().getFullYear()} ParseMyBill. All rights reserved.</p>
          <p className="text-xs mt-1">Data is saved to Cloud Firestore. Files are uploaded to Firebase Cloud Storage.</p>
        </footer>
      </div>
    </div>
  );
}
