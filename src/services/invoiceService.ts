
'use server';

import { db } from '@/config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';

const INVOICES_COLLECTION = 'invoices';

export interface StoredInvoiceData extends ExtractInvoiceDataOutput {
  userId: string;
  fileName: string;
  fileDownloadUrl: string;
  filePath: string; // Path in Firebase Storage
  createdAt: FieldValue; 
  updatedAt: FieldValue; 
}

export interface FetchedStoredInvoiceData extends ExtractInvoiceDataOutput {
  id: string;
  userId: string;
  fileName: string;
  fileDownloadUrl: string;
  filePath: string;
  createdAt: Date; 
  updatedAt: Date; 
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
  if (!userId) {
    throw new Error('User ID is required to save invoice metadata.');
  }
  try {
    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue } = {
      ...extractedData,
      userId: userId,
      fileName: fileName,
      fileDownloadUrl: fileDownloadUrl,
      filePath: filePath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), docData);
    return { id: docRef.id };
  } catch (e) {
    console.error('Error saving invoice metadata to Firestore: ', e);
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
  try {
    const invoiceDocRef = doc(db, INVOICES_COLLECTION, documentId);
    const updateData: Partial<Omit<StoredInvoiceData, 'userId' | 'fileName' | 'fileDownloadUrl' | 'filePath' | 'createdAt'>> & { updatedAt: FieldValue } = {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(invoiceDocRef, updateData);
  } catch (e) {
    console.error('Error updating document in Firestore: ', e);
     if (e instanceof Error) {
      throw new Error(`Failed to update invoice data in Firestore: ${e.message}`);
    }
    throw new Error('Failed to update invoice data in Firestore due to an unknown error.');
  }
}
