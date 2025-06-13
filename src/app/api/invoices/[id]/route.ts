import { NextResponse } from 'next/server';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Define the type for Firestore invoice data
interface FirestoreInvoiceData {
  userId?: string;
  fileName?: string;
  fileDownloadUrl?: string;
  filePath?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  invoiceNumber?: string;
  invoiceDate?: Timestamp;
  lineItems?: Array<{description: string; amount: number}>;
  totalAmount?: number;
  [key: string]: any; // For any other fields
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params to comply with Next.js App Router requirements
    const { id } = await params;
    console.log(`API: Fetching invoice with ID: ${id}`);
    
    if (!id) {
      console.log('API: No invoice ID provided');
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Get the invoice document from Firestore
    const invoiceRef = doc(db, 'invoices', id);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      console.log(`API: Invoice with ID ${id} not found`);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    console.log(`API: Successfully found invoice with ID: ${id}`);

    // Get the invoice data
    const invoiceData = invoiceSnap.data() as FirestoreInvoiceData;
    
    // Convert Firestore timestamps to ISO strings for JSON serialization
    const serializedData = {
      ...invoiceData,
      createdAt: invoiceData.createdAt?.toDate?.() ? invoiceData.createdAt.toDate().toISOString() : invoiceData.createdAt,
      updatedAt: invoiceData.updatedAt?.toDate?.() ? invoiceData.updatedAt.toDate().toISOString() : invoiceData.updatedAt,
      invoiceDate: invoiceData.invoiceDate?.toDate?.() ? invoiceData.invoiceDate.toDate().toISOString() : invoiceData.invoiceDate,
      id: id
    };

    // Create a new object without the userId for public access
    const { userId, ...publicData } = serializedData;

    // Return the public invoice data with CORS headers
    return NextResponse.json(
      publicData,
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice data' },
      { status: 500 }
    );
  }
}
