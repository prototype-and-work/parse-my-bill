
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
  console.log('############################################################');
  console.log('--- [invoiceService] saveInvoiceMetadata: EXECUTION START ---');
  console.log('############################################################');
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
    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt?: FieldValue; updatedAt?: FieldValue } = {
      userId: userId,
      fileName: fileName,
      fileDownloadUrl: fileDownloadUrl,
      filePath: filePath,
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

    console.log('[invoiceService] Document data to be saved (timestamps will be processed by Firestore):', JSON.stringify(finalDocData, null, 2));

    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), finalDocData);
    console.log('[invoiceService] Successfully saved metadata to Firestore. Document ID:', docRef.id);
    console.log('############################################################');
    console.log('--- [invoiceService] saveInvoiceMetadata: EXECUTION SUCCESS ---');
    console.log('############################################################');
    return { id: docRef.id };
  } catch (e: any) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('--- [invoiceService] saveInvoiceMetadata: EXECUTION ERROR ---');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    let errorMessage = 'Failed to save invoice metadata due to an unknown error.';
    if (e instanceof Error) {
      errorMessage = `Failed to save invoice metadata: ${e.message}`;
    } else if (typeof e === 'string') {
      errorMessage = `Failed to save invoice metadata: ${e}`;
    } else if (e && typeof e.toString === 'function') {
      errorMessage = `Failed to save invoice metadata: ${e.toString()}`;
    }
    
    console.error('[invoiceService] Firestore Save Error - Full Error Object:', e);
    console.error(`[invoiceService] Firestore Save Error - Constructed Message: ${errorMessage}`);
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    throw new Error(errorMessage);
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
    
    const updatePayload: { [key: string]: any } = { updatedAt: serverTimestamp() };

    if (dataToUpdate.hasOwnProperty('invoiceNumber')) {
      updatePayload.invoiceNumber = dataToUpdate.invoiceNumber !== undefined ? dataToUpdate.invoiceNumber : null;
    }
    if (dataToUpdate.hasOwnProperty('invoiceDate')) {
      updatePayload.invoiceDate = dataToUpdate.invoiceDate !== undefined ? dataToUpdate.invoiceDate : null;
    }
    if (dataToUpdate.hasOwnProperty('lineItems')) {
        updatePayload.lineItems = dataToUpdate.lineItems !== undefined ? dataToUpdate.lineItems : []; 
    }
    if (dataToUpdate.hasOwnProperty('totalAmount')) {
      updatePayload.totalAmount = dataToUpdate.totalAmount !== undefined ? dataToUpdate.totalAmount : null;
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
