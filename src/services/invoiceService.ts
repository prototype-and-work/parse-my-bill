
'use server';

import { db } from '@/config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';

const INVOICES_COLLECTION = 'invoices';

export interface StoredInvoiceData {
  userId: string;
  fileName: string;
  fileDownloadUrl: string;
  filePath: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  // Fields from ExtractInvoiceDataOutput
  invoiceNumber?: string;
  invoiceDate?: string;
  lineItems?: { description: string; amount: number }[];
  totalAmount?: number;
}

export interface FetchedStoredInvoiceData extends Omit<StoredInvoiceData, 'createdAt' | 'updatedAt' | 'lineItems'> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lineItems?: { description: string; amount: number }[];
}


interface SaveInvoiceMetadataParams {
  extractedData: ExtractInvoiceDataOutput;
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
  console.log('[invoiceService] Input - ExtractedData:', JSON.stringify(extractedData, null, 2));


  if (!userId) {
    const errorMsg = 'User ID is required to save invoice metadata.';
    console.error(`[invoiceService] Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  if (!fileDownloadUrl) {
    const errorMsg = 'File Download URL is required to save invoice metadata.';
    console.error(`[invoiceService] Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }
   if (!filePath) {
    const errorMsg = 'File Path is required to save invoice metadata.';
    console.error(`[invoiceService] Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    // Construct docData ensuring undefined fields from extractedData are omitted
    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt?: FieldValue; updatedAt?: FieldValue } = {
      userId: userId,
      fileName: fileName,
      fileDownloadUrl: fileDownloadUrl,
      filePath: filePath,
      // Conditionally add optional fields only if they are defined
      ...(extractedData.invoiceNumber !== undefined && { invoiceNumber: extractedData.invoiceNumber }),
      ...(extractedData.invoiceDate !== undefined && { invoiceDate: extractedData.invoiceDate }),
      ...(extractedData.lineItems !== undefined && { lineItems: extractedData.lineItems }),
      ...(extractedData.totalAmount !== undefined && { totalAmount: extractedData.totalAmount }),
    };
    
    const finalDocData = {
        ...docData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    // Log the data just before saving,FieldValue will appear as objects but are handled by Firestore
    console.log('[invoiceService] Document data to be saved (timestamps will be processed by Firestore):', JSON.stringify(finalDocData, null, 2));

    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), finalDocData);
    console.log('[invoiceService] Successfully saved metadata to Firestore. Document ID:', docRef.id);
    return { id: docRef.id };
  } catch (e: any) { // Catch as 'any' or 'unknown' then check instance
    let errorMessage = 'Failed to save invoice metadata due to an unknown error.';
    if (e instanceof Error) {
      errorMessage = `Failed to save invoice metadata: ${e.message}`;
    } else if (typeof e === 'string') {
      errorMessage = `Failed to save invoice metadata: ${e}`;
    } else if (e && typeof e.toString === 'function') {
      errorMessage = `Failed to save invoice metadata: ${e.toString()}`;
    }
    
    console.error('[invoiceService] Error saving invoice metadata to Firestore. Full error object:', e);
    console.error(`[invoiceService] Constructed error message: ${errorMessage}`);
    throw new Error(errorMessage); // Re-throw a simple Error object with a string message
  }
}

export async function updateInvoiceInFirestore(
  documentId: string,
  dataToUpdate: Partial<ExtractInvoiceDataOutput>
): Promise<void> {
  console.log(`[invoiceService] Attempting to update document ${documentId} in Firestore.`);
  console.log('[invoiceService] Data to update:', JSON.stringify(dataToUpdate, null, 2));
  try {
    const invoiceDocRef = doc(db, INVOICES_COLLECTION, documentId);
    
    // Construct the update payload, ensuring undefined values are not sent
    const updatePayload: { [key: string]: any } = { updatedAt: serverTimestamp() };

    // Only include fields if they are explicitly provided in dataToUpdate and not undefined
    if (dataToUpdate.hasOwnProperty('invoiceNumber')) {
      if (dataToUpdate.invoiceNumber !== undefined) updatePayload.invoiceNumber = dataToUpdate.invoiceNumber;
      else updatePayload.invoiceNumber = null; // Or FieldValue.delete() if you want to remove it
    }
    if (dataToUpdate.hasOwnProperty('invoiceDate')) {
      if (dataToUpdate.invoiceDate !== undefined) updatePayload.invoiceDate = dataToUpdate.invoiceDate;
      else updatePayload.invoiceDate = null;
    }
    if (dataToUpdate.hasOwnProperty('lineItems')) {
        if (dataToUpdate.lineItems !== undefined) updatePayload.lineItems = dataToUpdate.lineItems;
        else updatePayload.lineItems = null; 
    }
    if (dataToUpdate.hasOwnProperty('totalAmount')) {
      if (dataToUpdate.totalAmount !== undefined) updatePayload.totalAmount = dataToUpdate.totalAmount;
      else updatePayload.totalAmount = null;
    }


    await updateDoc(invoiceDocRef, updatePayload);
    console.log(`[invoiceService] Successfully updated document ${documentId} in Firestore.`);
  } catch (e: any) {
    let errorMessage = 'Failed to update invoice data in Firestore due to an unknown error.';
     if (e instanceof Error) {
      errorMessage = `Failed to update invoice data in Firestore: ${e.message}`;
    } else if (typeof e === 'string') {
      errorMessage = `Failed to update invoice data in Firestore: ${e}`;
    } else if (e && typeof e.toString === 'function') {
        errorMessage = `Failed to update invoice data in Firestore: ${e.toString()}`;
    }
    console.error(`[invoiceService] Error updating document ${documentId} in Firestore. Full error object:`, e);
    console.error(`[invoiceService] Constructed error message for update: ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

