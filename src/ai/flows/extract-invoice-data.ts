
'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting invoice data.
 *
 * - extractInvoiceData - A function that takes an invoice image/PDF and extracts key information.
 * - ExtractInvoiceDataInput - The input type for the extractInvoiceData function.
 * - ExtractInvoiceDataOutput - The return type for the extractInvoiceData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInvoiceDataInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "The invoice document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const ExtractInvoiceDataOutputSchema = z.object({
  invoiceNumber: z.string().optional().describe('The unique identifier for the invoice.'),
  invoiceDate: z.string().optional().describe('The date the invoice was issued, preferably in YYYY-MM-DD format. If not possible, use the format as it appears on the invoice.'),
  lineItems: z
    .array(
      z.object({
        description: z.string().describe('Detailed description of the service or product for the line item.'),
        amount: z.number().describe('The numerical cost for this specific line item.'),
      })
    )
    .optional()
    .describe('An array of all line items. Each item should have a description and an amount.'),
  totalAmount: z.number().optional().describe('The final total amount due on the invoice.'),
});
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return extractInvoiceDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractInvoiceDataPrompt',
  input: {schema: ExtractInvoiceDataInputSchema},
  output: {schema: ExtractInvoiceDataOutputSchema},
  prompt: `You are an expert AI assistant specializing in accurately extracting structured data from invoices.
  Your primary task is to meticulously analyze the provided invoice document (which could be a PDF or an image)
  and extract specific pieces of information. Adhere strictly to the JSON schema defined for the output.

  Information to Extract:
  1.  **Invoice Number**: Locate and extract the unique identifier for the invoice. This is often labeled as "Invoice #", "Invoice No.", or similar. If multiple potential identifiers exist, prioritize the most prominent or clearly labeled one.
  2.  **Invoice Date**: Find the date the invoice was issued. Prioritize clarity:
      *   If the date format is unambiguous (e.g., YYYY-MM-DD, DD-MMM-YYYY), extract it.
      *   If the format is ambiguous (e.g., 01/02/03), extract it exactly as it appears on the invoice to avoid misinterpretation.
      *   If multiple dates are present (e.g., "Invoice Date", "Due Date"), ensure you extract the "Invoice Date".
  3.  **Line Items**: Identify each distinct item, service, or charge listed. These are typically presented in a tabular format or as a list with descriptions and corresponding costs. For each line item, extract:
      *   \`description\`: A clear and concise description of the item or service. Capture enough detail to uniquely identify the item.
      *   \`amount\`: The numerical cost associated with that specific line item. Ensure this is a number (e.g., 123.45, not "$123.45").
  4.  **Total Amount**: Determine the final, grand total amount due as stated on the invoice. This is often labeled "Total", "Grand Total", "Amount Due", etc. Ensure this is a number.

  Important Instructions for Accuracy and Completeness:
  *   **Schema Adherence**: The output MUST be a valid JSON object that strictly conforms to the defined output schema. All field names and data types must match.
  *   **Optional Fields**: If any of the requested top-level fields (invoiceNumber, invoiceDate, totalAmount) are not present on the document or cannot be reliably determined, you MUST omit them from the output JSON or return them as per the schema's optional definition (e.g., if the schema allows null, use null; otherwise, omit). Do not guess or fabricate data.
  *   **Line Items Handling**:
      *   If no line items are discernible, or if line items are present but descriptions or amounts are missing/unclear for all of them, return an empty array for \`lineItems\` or omit the field if the schema allows.
      *   For individual line items, if a description is clear but an amount is missing (or vice-versa), extract what is available and follow schema rules for the missing part (e.g., omit optional sub-fields or use default values if specified in the schema).
  *   **Currency and Formatting**: For numerical values (amounts), extract only the number. Do not include currency symbols (e.g., $, €), thousands separators (e.g., 1,234.56 should be 1234.56), or other non-numeric characters unless the schema explicitly asks for them as strings.
  *   **Ambiguity**: If a piece of information is highly ambiguous or illegible, err on the side of caution and omit it rather than providing potentially incorrect data.

  Invoice Document to Process:
  {{media url=invoiceDataUri}}`,
});

const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

