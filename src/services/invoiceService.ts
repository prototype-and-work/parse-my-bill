
'use server';

import { db, storage } from '@/config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';

const INVOICES_COLLECTION = 'invoices';

export interface StoredInvoiceData extends ExtractInvoiceDataOutput {
  fileName: string;
  fileDownloadUrl: string;
  filePath: string; // Path in Firebase Storage
  createdAt: FieldValue; // For writing
  updatedAt: FieldValue; // For writing
}

// Interface for data read from Firestore (timestamps are resolved)
export interface FetchedStoredInvoiceData extends ExtractInvoiceDataOutput {
  id: string;
  fileName: string;
  fileDownloadUrl: string;
  filePath: string;
  createdAt: Date; // Firebase Timestamps are converted to Date objects on read
  updatedAt: Date; // Firebase Timestamps are converted to Date objects on read
}

async function uploadInvoiceFile(file: File, pathPrefix: string): Promise<{ downloadURL: string; filePath: string }> {
  const uniqueFileName = `${pathPrefix}/${new Date().getTime()}_${file.name}`;
  const fileReference = storageRef(storage, uniqueFileName);

  try {
    await uploadBytes(fileReference, file);
    const downloadURL = await getDownloadURL(fileReference);
    return { downloadURL, filePath: uniqueFileName };
  } catch (e) {
    console.error('Error uploading file to Firebase Storage: ', e);
    if (e instanceof Error) {
      throw new Error(`Failed to upload file: ${e.message}`);
    }
    throw new Error('Failed to upload file due to an unknown error.');
  }
}

export async function saveInitialInvoice(
  extractedData: ExtractInvoiceDataOutput,
  file: File
): Promise<{ id: string; fileDownloadUrl: string; filePath: string }> {
  try {
    const { downloadURL, filePath } = await uploadInvoiceFile(file, 'invoices');

    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue } = {
      ...extractedData,
      fileName: file.name,
      fileDownloadUrl: downloadURL,
      filePath: filePath,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), docData);
    return { id: docRef.id, fileDownloadUrl: downloadURL, filePath: filePath };
  } catch (e) {
    console.error('Error saving invoice to Firestore: ', e);
    if (e instanceof Error) {
      throw new Error(`Failed to save invoice data: ${e.message}`);
    }
    throw new Error('Failed to save invoice data due to an unknown error.');
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

