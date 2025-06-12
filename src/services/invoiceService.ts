
'use server';

import { db } from '@/config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';

const INVOICES_COLLECTION = 'invoices';

export interface StoredInvoiceData extends ExtractInvoiceDataOutput {
  fileName: string;
  createdAt: FieldValue; // For writing
  updatedAt: FieldValue; // For writing
  // downloadLink: string; // Placeholder for future Cloud Storage integration
}

// Interface for data read from Firestore (timestamps are resolved)
export interface FetchedStoredInvoiceData extends ExtractInvoiceDataOutput {
  id: string;
  fileName: string;
  createdAt: Date; // Firebase Timestamps are converted to Date objects on read
  updatedAt: Date; // Firebase Timestamps are converted to Date objects on read
}

export async function saveInitialInvoice(
  extractedData: ExtractInvoiceDataOutput,
  fileName: string
): Promise<string> {
  try {
    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue } = {
      ...extractedData,
      fileName: fileName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), docData);
    return docRef.id;
  } catch (e) {
    console.error('Error adding document to Firestore: ', e);
    if (e instanceof Error) {
      throw new Error(`Failed to save invoice data to Firestore: ${e.message}`);
    }
    throw new Error('Failed to save invoice data to Firestore due to an unknown error.');
  }
}

export async function updateInvoiceInFirestore(
  documentId: string,
  dataToUpdate: Partial<ExtractInvoiceDataOutput>
): Promise<void> {
  try {
    const invoiceDocRef = doc(db, INVOICES_COLLECTION, documentId);
    const updateData: Partial<StoredInvoiceData> & { updatedAt: FieldValue } = {
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
