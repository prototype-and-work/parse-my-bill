"use client";

import { useState, useEffect } from 'react';
import { InvoiceList } from '@/components/InvoiceList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, FileText } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';


export default function InvoicesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user) {
      setIsLoading(false);
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-grow px-6 py-6 bg-slate-50">
          <div className="mb-6">
            <h1 className="text-2xl font-headline font-semibold text-slate-800">My Invoices</h1>
            <p className="text-slate-600 text-sm">View and manage all your scanned invoices</p>
          </div>
          
          {/* Render the InvoiceList component with the user ID */}
          {user && <InvoiceList userId={user.uid} />}
        </main>
        <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-200">
          <p>&copy; {new Date().getFullYear()} ParseMyBill. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
