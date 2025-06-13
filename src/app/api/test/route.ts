import { NextResponse } from 'next/server';

export async function GET() {
  // Create a sample invoice data object
  const testData = {
    invoiceNumber: "TEST-123",
    invoiceDate: new Date().toISOString(),
    lineItems: [
      { description: "Test Item 1", amount: 100 },
      { description: "Test Item 2", amount: 50 }
    ],
    totalAmount: 150,
    id: "test-invoice-id"
  };

  // Return the test data as JSON
  return NextResponse.json(testData);
}
