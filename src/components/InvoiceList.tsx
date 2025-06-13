"use client";

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  deleteDoc, 
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db, storage } from '@/config/firebase';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  MoreVertical, 
  FileText, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Download,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  QrCode
} from "lucide-react";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { Badge } from "@/components/ui/badge";
// Import will be resolved once the InvoiceEditForm component is fully created
import { InvoiceEditForm } from './InvoiceEditForm';
import { FetchedStoredInvoiceData } from '@/services/invoiceService';
import { InvoiceQRCode } from './InvoiceQRCode';

interface InvoiceListProps {
  userId: string | undefined;
}

export function InvoiceList({ userId }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<FetchedStoredInvoiceData[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<FetchedStoredInvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<FetchedStoredInvoiceData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchInvoices = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedInvoices: FetchedStoredInvoiceData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const invoice: FetchedStoredInvoiceData = {
          id: doc.id,
          userId: data.userId,
          fileName: data.fileName,
          fileDownloadUrl: data.fileDownloadUrl,
          filePath: data.filePath,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
          invoiceNumber: data.invoiceNumber || '',
          invoiceDate: data.invoiceDate instanceof Timestamp ? data.invoiceDate.toDate() : null,
          lineItems: data.lineItems || [],
          description: data.description || '',
          amount: data.amount || 0,
          totalAmount: data.totalAmount || 0
        };
        fetchedInvoices.push(invoice);
      });
      
      setInvoices(fetchedInvoices);
      setFilteredInvoices(fetchedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchInvoices();
    }
  }, [userId]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInvoices(invoices);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = invoices.filter(invoice => 
        (invoice.fileName.toLowerCase().includes(lowercasedSearch)) ||
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(lowercasedSearch)) ||
        (invoice.description && invoice.description.toLowerCase().includes(lowercasedSearch))
      );
      setFilteredInvoices(filtered);
    }
  }, [searchTerm, invoices]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInvoices();
  };

  const handleEdit = (invoice: FetchedStoredInvoiceData) => {
    setSelectedInvoice(invoice);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (invoice: FetchedStoredInvoiceData) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleShowQrCode = (invoice: FetchedStoredInvoiceData) => {
    setSelectedInvoice(invoice);
    setIsQrCodeDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'invoices', selectedInvoice.id));
      
      // Delete from Storage if file path exists
      if (selectedInvoice.filePath) {
        const fileRef = storageRef(storage, selectedInvoice.filePath);
        await deleteObject(fileRef);
      }
      
      // Update local state
      setInvoices(invoices.filter(invoice => invoice.id !== selectedInvoice.id));
      setFilteredInvoices(filteredInvoices.filter(invoice => invoice.id !== selectedInvoice.id));
      
      toast({
        title: "Invoice Deleted",
        description: "The invoice has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Error",
        description: "Failed to delete invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
    }
  };

  const handleUpdateSuccess = (updatedInvoice: FetchedStoredInvoiceData) => {
    setInvoices(invoices.map(invoice => 
      invoice.id === updatedInvoice.id ? updatedInvoice : invoice
    ));
    setFilteredInvoices(filteredInvoices.map(invoice => 
      invoice.id === updatedInvoice.id ? updatedInvoice : invoice
    ));
    setIsEditDialogOpen(false);
    setSelectedInvoice(null);
    
    toast({
      title: "Invoice Updated",
      description: "The invoice has been successfully updated.",
    });
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return format(date, 'MMM dd, yyyy');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="text-center py-10 border rounded-md bg-background/50">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No invoices found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoices.length === 0 
              ? "You haven't uploaded any invoices yet." 
              : "No invoices match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber || 
                      <span className="text-muted-foreground italic">No number</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      {formatDate(invoice.invoiceDate)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {invoice.fileName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.totalAmount || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <a 
                            href={invoice.fileDownloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center w-full"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Original
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <a 
                            href={invoice.fileDownloadUrl} 
                            download={invoice.fileName}
                            className="flex items-center w-full"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShowQrCode(invoice)}>
                          <QrCode className="h-4 w-4 mr-2" />
                          Show QR Code
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(invoice)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update the invoice information below.
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceEditForm 
              invoice={selectedInvoice} 
              onUpdateSuccess={handleUpdateSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrCodeDialogOpen} onOpenChange={setIsQrCodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invoice QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to access the invoice data in JSON format
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="py-4">
              <InvoiceQRCode 
                invoiceData={selectedInvoice} 
                title={`Invoice #${selectedInvoice.invoiceNumber || 'Unknown'}`} 
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrCodeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
