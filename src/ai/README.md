# AI Flows and Processes

This document provides an overview of the AI flows and processes used in the 'parse-my-bill' application.

## High-Level Process Overview

The core AI functionality of this project is to automatically extract structured data from invoice documents (such as images or PDFs). This is achieved through a combination of a powerful language model and a structured data extraction flow. The process is designed to be robust, handling various invoice formats and ensuring data accuracy.

## Key AI Flows and Technology Used

### Technology Stack

- **Genkit**: A framework for building and managing AI flows.
- **Google AI Plugin**: Integrates Google's AI models into the Genkit framework.
- **Gemini-2.0-Flash**: The specific language model used for data extraction.

### AI Flow: `extractInvoiceDataFlow`

- **Purpose**: The primary purpose of this flow is to take an invoice document as input and return a structured JSON object containing key information from the invoice.

- **Process**:
  1.  **Input**: The flow receives a `data URI` representing the invoice document. This URI includes the MIME type and Base64 encoded data of the invoice.
  2.  **Prompting**: A detailed prompt is sent to the Gemini model, instructing it to act as an expert in invoice data extraction. The prompt specifies the exact fields to be extracted:
      - `invoiceNumber`
      - `invoiceDate`
      - `lineItems` (including `description` and `amount` for each item)
      - `totalAmount`
  3.  **Data Extraction**: The Gemini model analyzes the invoice and extracts the requested information, adhering to the specified JSON schema for the output.
  4.  **Output**: The flow returns a structured JSON object containing the extracted data. The output schema is strictly enforced to ensure consistency and reliability.

This flow is defined in `src/ai/flows/extract-invoice-data.ts` and is the central component of the application's AI capabilities.
