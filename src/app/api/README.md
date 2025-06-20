# API Endpoints

This document provides an overview of the API endpoints used in the 'parse-my-bill' application.

## API Routes

### 1. `POST /api/invoices/extract`

- **File**: `src/app/api/invoices/extract/route.ts`
- **Purpose**: This endpoint is responsible for extracting data from an invoice document using the AI flow and updating the corresponding record in Firestore.
- **Process**:
  1.  **Request**: The endpoint expects a `POST` request with a JSON body containing `invoiceId` and `invoiceDataUri`.
  2.  **AI Extraction**: It invokes the `extractInvoiceData` Genkit flow to process the invoice and extract structured data.
  3.  **Database Update**: The extracted data is then used to update the corresponding invoice document in the Firestore database.
  4.  **Response**: Returns a success message along with the `invoiceId` and the extracted data.

### 2. `GET /api/invoices/[id]`

- **File**: `src/app/api/invoices/[id]/route.ts`
- **Purpose**: This dynamic route fetches a single invoice from the Firestore database by its document ID.
- **Process**:
  1.  **Request**: The endpoint expects a `GET` request where `[id]` is the unique identifier of the invoice document in Firestore.
  2.  **Database Query**: It queries the `invoices` collection in Firestore to find the document with the specified ID.
  3.  **Data Serialization**: Timestamps and other Firestore-specific data types are converted into a JSON-serializable format.
  4.  **Response**: Returns the public data of the invoice as a JSON object.

### 3. `GET /api/test`

- **File**: `src/app/api/test/route.ts`
- **Purpose**: This endpoint provides a static set of sample invoice data, which is useful for testing and development.
- **Process**:
  1.  **Request**: The endpoint expects a `GET` request.
  2.  **Static Data**: It returns a predefined JSON object containing sample invoice information.
  3.  **Response**: The static JSON object is returned as the response.
