
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
  invoiceNumber?: string;
  invoiceDate?: Date | null;
  lineItems?: { description: string; amount: number }[];
  totalAmount?: number;
}

export interface FetchedStoredInvoiceData extends Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  description: string;
  amount: number;
  lineItems?: { description: string; amount: number }[];
}


// This function is no longer called by InvoiceUploadForm for CREATING invoices,
// as that logic has moved to the client-side.
// It's kept here for potential future use or as a reference.
// IMPORTANT: If you decide to use this server action again for creating invoices,
// ensure it handles authentication and authorization appropriately, as server actions
// don't automatically carry the client's Firebase auth context in the same way.
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
  console.log('--- [invoiceService] saveInvoiceMetadata (SERVER ACTION): EXECUTION START ---');
  console.log('############################################################');
  console.log('[invoiceService] (SERVER ACTION) Input - User ID:', userId);
  console.log('[invoiceService] (SERVER ACTION) Input - FileName:', fileName);
  console.log('[invoiceService] (SERVER ACTION) Input - FileDownloadUrl:', fileDownloadUrl);
  console.log('[invoiceService] (SERVER ACTION) Input - FilePath:', filePath);
  console.log('[invoiceService] (SERVER ACTION) Input - ExtractedData:', JSON.stringify(extractedData, null, 2));

  if (!userId) {
    const errorMsg = 'User ID is required to save invoice metadata.';
    console.error(`[invoiceService] (SERVER ACTION) Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }
   if (!fileDownloadUrl) {
    const errorMsg = 'File Download URL is required to save invoice metadata.';
    console.error(`[invoiceService] (SERVER ACTION) Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }
   if (!filePath) {
    const errorMsg = 'File Path is required to save invoice metadata.';
    console.error(`[invoiceService] (SERVER ACTION) Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt?: FieldValue; updatedAt?: FieldValue } = {
      userId: userId,
      fileName: fileName,
      fileDownloadUrl: fileDownloadUrl,
      filePath: filePath,
    };
    
    // Conditionally add optional fields from extractedData
    if (extractedData.invoiceNumber !== undefined) {
      docData.invoiceNumber = extractedData.invoiceNumber;
    }
    if (extractedData.invoiceDate !== undefined && extractedData.invoiceDate !== null) {
      const parsedDate = new Date(extractedData.invoiceDate as string | number | Date);
      if (!isNaN(parsedDate.getTime())) {
        docData.invoiceDate = parsedDate;
      } else {
        console.warn(`[invoiceService] (SERVER ACTION) Invalid invoice date received: "${extractedData.invoiceDate}". It will not be saved.`);
        // Optionally, set docData.invoiceDate = null; if your Firestore schema allows null for this field.
      }
    }
    if (extractedData.lineItems !== undefined) {
      docData.lineItems = extractedData.lineItems;
    }
    if (extractedData.totalAmount !== undefined) {
      docData.totalAmount = extractedData.totalAmount;
    }
    
    const finalDocData = {
        ...docData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    console.log('[invoiceService] (SERVER ACTION) Document data to be saved (timestamps will be processed by Firestore):', JSON.stringify(finalDocData, null, 2));

    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), finalDocData);
    console.log('[invoiceService] (SERVER ACTION) Successfully saved metadata to Firestore. Document ID:', docRef.id);
    console.log('############################################################');
    console.log('--- [invoiceService] saveInvoiceMetadata (SERVER ACTION): EXECUTION SUCCESS ---');
    console.log('############################################################');
    return { id: docRef.id };
  } catch (e: any) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('--- [invoiceService] saveInvoiceMetadata (SERVER ACTION): EXECUTION ERROR ---');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    let errorMessage = 'Failed to save invoice metadata due to an unknown error.';
    if (e instanceof Error) {
      errorMessage = `Failed to save invoice metadata: ${e.message}`;
    } else if (typeof e === 'string') {
      errorMessage = `Failed to save invoice metadata: ${e}`;
    } else if (e && typeof e.toString === 'function') {
      errorMessage = `Failed to save invoice metadata: ${e.toString()}`;
    }
    
    console.error('[invoiceService] (SERVER ACTION) Firestore Save Error - Full Error Object:', e);
    console.error(`[invoiceService] (SERVER ACTION) Firestore Save Error - Constructed Message: ${errorMessage}`);
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
