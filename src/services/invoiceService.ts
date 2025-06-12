
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
    // Construct docData ensuring undefined fields from extractedData are omitted
    const docData: StoredInvoiceData = {
      userId: userId,
      fileName: fileName,
      fileDownloadUrl: fileDownloadUrl,
      filePath: filePath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Conditionally add optional fields only if they are defined
      ...(extractedData.invoiceNumber !== undefined && { invoiceNumber: extractedData.invoiceNumber }),
      ...(extractedData.invoiceDate !== undefined && { invoiceDate: extractedData.invoiceDate }),
      ...(extractedData.lineItems !== undefined && { lineItems: extractedData.lineItems }),
      ...(extractedData.totalAmount !== undefined && { totalAmount: extractedData.totalAmount }),
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
  dataToUpdate: Partial<ExtractInvoiceDataOutput>
): Promise<void> {
  console.log(`[invoiceService] Attempting to update document ${documentId} in Firestore.`);
  console.log('[invoiceService] Data to update:', JSON.stringify(dataToUpdate, null, 2));
  try {
    const invoiceDocRef = doc(db, INVOICES_COLLECTION, documentId);
    
    // Construct the update payload, ensuring undefined values are not sent
    const updatePayload: { [key: string]: any } = { updatedAt: serverTimestamp() };
    if (dataToUpdate.invoiceNumber !== undefined) updatePayload.invoiceNumber = dataToUpdate.invoiceNumber;
    if (dataToUpdate.invoiceDate !== undefined) updatePayload.invoiceDate = dataToUpdate.invoiceDate;
    if (dataToUpdate.lineItems !== undefined) updatePayload.lineItems = dataToUpdate.lineItems;
    if (dataToUpdate.totalAmount !== undefined) updatePayload.totalAmount = dataToUpdate.totalAmount;

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
