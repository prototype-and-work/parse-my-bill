"use client";

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, QrCode, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceQRCodeProps {
  invoiceData: any;
  title?: string;
}

export function InvoiceQRCode({ invoiceData, title = "Invoice QR Code" }: InvoiceQRCodeProps) {
  const { toast } = useToast();
  const [qrSize, setQrSize] = useState(200);
  const [qrUrl, setQrUrl] = useState('');
  
  // Generate API endpoint URL for the invoice
  useEffect(() => {
    if (invoiceData) {
      // Check if we have an ID (saved invoice) or need to use JSON data directly
      if (invoiceData.id) {
        // Use absolute URL with origin for QR code
        const origin = window.location.origin;
        const apiUrl = `${origin}/api/invoices/${invoiceData.id}`;
        setQrUrl(apiUrl);
        console.log(`Generated QR URL for invoice ID: ${invoiceData.id}`);
      } else {
        // No ID available, use data URI with JSON content
        const jsonString = JSON.stringify(invoiceData);
        const encodedJson = encodeURIComponent(jsonString);
        const dataUrl = `data:application/json;charset=utf-8,${encodedJson}`;
        setQrUrl(dataUrl);
        console.log('No invoice ID available, using data URI with JSON content');
      }
    }
  }, [invoiceData]);
  
  // Handle download of QR code as SVG
  const handleDownloadQR = () => {
    try {
      // Get the SVG element
      const svgElement = document.getElementById('invoice-qr-code');
      if (!svgElement) {
        throw new Error('QR Code SVG element not found');
      }
      
      // Create a Blob from the SVG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger click
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-qr-${invoiceData.invoiceNumber || 'data'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "QR Code Downloaded",
        description: "The QR code has been downloaded as an SVG file.",
      });
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the QR code. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle copy of API URL to clipboard
  const handleCopyUrl = () => {
    if (!qrUrl) return;
    
    navigator.clipboard.writeText(qrUrl)
      .then(() => {
        toast({
          title: "URL Copied",
          description: "API URL has been copied to clipboard.",
        });
      })
      .catch((error) => {
        console.error("Failed to copy URL:", error);
        toast({
          title: "Copy Failed",
          description: "Could not copy the URL. Please try again.",
          variant: "destructive",
        });
      });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline text-lg flex items-center">
          <QrCode className="mr-2 h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>
          Scan this QR code to access the invoice data in JSON format
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-md mb-4">
          {qrUrl ? (
            <QRCodeSVG
              id="invoice-qr-code"
              value={qrUrl}
              size={qrSize}
              level="M" // QR code error correction level (L, M, Q, H)
              includeMargin={true}
              className="mx-auto"
            />
          ) : (
            <div className="flex items-center justify-center h-[200px] w-[200px] bg-slate-100 rounded-md">
              <p className="text-sm text-slate-500">Loading QR code...</p>
            </div>
          )}
        </div>
        {qrUrl && (
          <div className="w-full mb-4">
            <p className="text-xs text-slate-500 text-center mb-2 break-all">{qrUrl}</p>
          </div>
        )}
        <div className="flex justify-center w-full space-x-2">
          <Button
            onClick={handleDownloadQR}
            variant="outline"
            className="flex items-center"
            disabled={!qrUrl}
          >
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>
          <Button
            onClick={handleCopyUrl}
            variant="outline"
            className="flex items-center"
            disabled={!qrUrl}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
