import { NextRequest, NextResponse } from 'next/server';
import { extractInvoiceData } from '@/ai/flows/extract-invoice-data';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, invoiceDataUri } = await request.json();
    
    if (!invoiceId || !invoiceDataUri) {
      return NextResponse.json(
        { error: 'Missing required parameters: invoiceId and invoiceDataUri' },
        { status: 400 }
      );
    }

    // Extract data using Genkit
    console.log(`[API] Starting AI extraction for invoice ID: ${invoiceId}`);
    const extractedData = await extractInvoiceData({ invoiceDataUri });
    console.log(`[API] AI extraction completed for invoice ID: ${invoiceId}`);
    
    // Update the document in Firestore with the extracted data
    const invoiceRef = doc(db, "invoices", invoiceId);
    
    // Prepare data for update
    const updateData: Record<string, any> = {
      status: 'processed',
    };
    
    // Add extracted fields if they exist
    if (extractedData.invoiceNumber !== undefined) {
      updateData.invoiceNumber = extractedData.invoiceNumber;
    }
    
    if (extractedData.invoiceDate !== undefined) {
      // Convert to Date object if it's a string
      if (typeof extractedData.invoiceDate === 'string') {
        const parsedDate = new Date(extractedData.invoiceDate);
        if (!isNaN(parsedDate.getTime())) {
          updateData.invoiceDate = parsedDate;
        }
      } else {
        updateData.invoiceDate = extractedData.invoiceDate;
      }
    }
    
    if (extractedData.lineItems !== undefined && Array.isArray(extractedData.lineItems)) {
      updateData.lineItems = extractedData.lineItems.map(item => ({
        description: item.description || '',
        amount: typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : 0
      }));
    }
    
    if (extractedData.totalAmount !== undefined && extractedData.totalAmount !== null) {
      const numericTotalAmount = parseFloat(String(extractedData.totalAmount));
      if (!isNaN(numericTotalAmount)) {
        updateData.totalAmount = numericTotalAmount;
      }
    }
    
    // Update the document
    await updateDoc(invoiceRef, updateData);
    console.log(`[API] Firestore document updated for invoice ID: ${invoiceId}`);
    
    return NextResponse.json({ 
      success: true, 
      invoiceId,
      extractedData
    });
  } catch (error) {
    console.error('[API] Error in invoice extraction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error during extraction' },
      { status: 500 }
    );
  }
}
