
'use server';

import { db, storage, auth } from '@/config/firebase'; // auth import might not be directly used here but good for context
import { collection, addDoc, doc, updateDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ExtractInvoiceDataOutput } from '@/ai/flows/extract-invoice-data';

const INVOICES_COLLECTION = 'invoices';

export interface StoredInvoiceData extends ExtractInvoiceDataOutput {
  userId: string; // Added userId
  fileName: string;
  fileDownloadUrl: string;
  filePath: string; // Path in Firebase Storage
  createdAt: FieldValue; // For writing
  updatedAt: FieldValue; // For writing
}

// Interface for data read from Firestore (timestamps are resolved)
export interface FetchedStoredInvoiceData extends ExtractInvoiceDataOutput {
  id: string;
  userId: string; // Added userId
  fileName: string;
  fileDownloadUrl: string;
  filePath: string;
  createdAt: Date; // Firebase Timestamps are converted to Date objects on read
  updatedAt: Date; // Firebase Timestamps are converted to Date objects on read
}

async function uploadInvoiceFile(file: File, fullPath: string): Promise<{ downloadURL: string; filePath: string }> {
  const fileReference = storageRef(storage, fullPath);

  try {
    await uploadBytes(fileReference, file);
    const downloadURL = await getDownloadURL(fileReference);
    return { downloadURL, filePath: fullPath };
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
  file: File,
  userId: string // Added userId parameter
): Promise<{ id: string; fileDownloadUrl: string; filePath: string }> {
  if (!userId) {
    throw new Error('User ID is required to save an invoice.');
  }
  try {
    // Construct user-specific file path
    const uniqueFileName = `${new Date().getTime()}_${file.name}`;
    const fullStoragePath = `users/${userId}/invoices/${uniqueFileName}`;
    
    const { downloadURL, filePath } = await uploadInvoiceFile(file, fullStoragePath);

    const docData: Omit<StoredInvoiceData, 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue } = {
      ...extractedData,
      userId: userId, // Store userId
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
  // Note: Firestore rules should protect this update based on userId in the document.
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
