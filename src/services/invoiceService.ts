
'use server';

import { db } from '@/config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
// Use the potentially simplified ExtractInvoiceDataOutput for type consistency during debugging
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data'; 

const INVOICES_COLLECTION = 'invoices';

// Adjusted to reflect potentially simplified data during timeout debugging
export interface StoredInvoiceData {
  userId: string;
  fileName: string;
  fileDownloadUrl: string;
  filePath: string; 
  createdAt: FieldValue; 
  updatedAt: FieldValue; 
  // Fields from ExtractInvoiceDataOutput (simplified)
  invoiceNumber?: string;
  invoiceDate?: string; // Keep as optional for now as it might be removed in simplified schema
  lineItems?: { description: string; amount: number }[]; // Keep as optional
  totalAmount?: number;
}

// Adjusted FetchedStoredInvoiceData
export interface FetchedStoredInvoiceData {
  id: string;
  userId: string;
  fileName:string;
  fileDownloadUrl: string;
  filePath: string;
  createdAt: Date; 
  updatedAt: Date;
  // Fields from ExtractInvoiceDataOutput (simplified)
  invoiceNumber?: string;
  invoiceDate?: string;
  lineItems?: { description: string; amount: number }[];
  totalAmount?: number;
}


interface SaveInvoiceMetadataParams {
  extractedData: ExtractInvoiceDataOutput; // This will be the simplified version
  fileName: string;
  fileDownloadUrl: string;
  filePath: string;
  userId: string;
}

export async function saveInvoiceMetadata(
  { extractedData, fileName, fileDownloadUrl, filePath, userId }: SaveInvoiceMetadataParams
): Promise<{ id: string }> {
  console.log('[invoiceService] Attempting to save metadata to Firestore.');
  console.log('[invoiceService] Input - User ID:', userId);
  console.log('[invoiceService] Input - FileName:', fileName);
  console.log('[invoiceService] Input - FileDownloadUrl:', fileDownloadUrl);
  console.log('[invoiceService] Input - FilePath:', filePath);
  // Log the simplified extractedData
  console.log('[invoiceService] Input - ExtractedData (potentially simplified):', JSON.stringify(extractedData, null, 2));


  if (!userId) {
    console.error('[invoiceService] Error: User ID is required to save invoice metadata.');
    throw new Error('User ID is required to save invoice metadata.');
  }
  if (!fileDownloadUrl) {
    console.error('[invoiceService] Error: File Download URL is required.');
    throw new Error('File Download URL is required to save invoice metadata.');
  }
   if (!filePath) {
    console.error('[invoiceService] Error: File Path is required.');
    throw new Error('File Path is required to save invoice metadata.');
  }

  try {
    // Construct docData based on the simplified extractedData
    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt' | 'invoiceDate' | 'lineItems'> & { createdAt: FieldValue, updatedAt: FieldValue, invoiceDate?: string, lineItems?: any[] } = {
      userId: userId,
      fileName: fileName,
      fileDownloadUrl: fileDownloadUrl,
      filePath: filePath,
      invoiceNumber: extractedData.invoiceNumber,
      totalAmount: extractedData.totalAmount,
      // invoiceDate: extractedData.invoiceDate, // Removed if not in simplified schema
      // lineItems: extractedData.lineItems, // Removed if not in simplified schema
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log('[invoiceService] Document data to be saved:', JSON.stringify(docData, null, 2));

    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), docData);
    console.log('[invoiceService] Successfully saved metadata to Firestore. Document ID:', docRef.id);
    return { id: docRef.id };
  } catch (e) {
    console.error('[invoiceService] Error saving invoice metadata to Firestore: ', e);
    if (e instanceof Error) {
      throw new Error(`Failed to save invoice metadata: ${e.message}`);
    }
    throw new Error('Failed to save invoice metadata due to an unknown error.');
  }
}

export async function updateInvoiceInFirestore(
  documentId: string,
  dataToUpdate: Partial<ExtractInvoiceDataOutput> // This is the simplified schema for now
): Promise<void> {
  console.log(`[invoiceService] Attempting to update document ${documentId} in Firestore.`);
  console.log('[invoiceService] Data to update (potentially simplified):', JSON.stringify(dataToUpdate, null, 2));
  try {
    const invoiceDocRef = doc(db, INVOICES_COLLECTION, documentId);
    // Ensure dataToUpdate aligns with StoredInvoiceData structure
    const updatePayload: Partial<Omit<StoredInvoiceData, 'userId' | 'fileName' | 'fileDownloadUrl' | 'filePath' | 'createdAt'>> & { updatedAt: FieldValue } = {
        ...(dataToUpdate.invoiceNumber && { invoiceNumber: dataToUpdate.invoiceNumber }),
        // ...(dataToUpdate.invoiceDate && { invoiceDate: dataToUpdate.invoiceDate }),
        // ...(dataToUpdate.lineItems && { lineItems: dataToUpdate.lineItems }),
        ...(dataToUpdate.totalAmount !== undefined && { totalAmount: dataToUpdate.totalAmount }),
        updatedAt: serverTimestamp(),
    };
    await updateDoc(invoiceDocRef, updatePayload);
    console.log(`[invoiceService] Successfully updated document ${documentId} in Firestore.`);
  } catch (e) {
    console.error(`[invoiceService] Error updating document ${documentId} in Firestore: `, e);
     if (e instanceof Error) {
      throw new Error(`Failed to update invoice data in Firestore: ${e.message}`);
    }
    throw new Error('Failed to update invoice data in Firestore due to an unknown error.');
  }
}
