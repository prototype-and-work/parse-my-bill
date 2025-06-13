"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ReceiptText, LogOut, LogIn, UserPlus, Loader2, FileText, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <aside className="bg-slate-200 w-64 min-h-screen flex flex-col shadow-md">
      <div className="bg-slate-300 p-4 flex items-center">
        <ReceiptText size={28} className="mr-3 text-slate-700" />
        <h1 className="text-xl font-headline font-semibold text-slate-800">ParseMyBill</h1>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          <li>
            <Link 
              href="/" 
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive('/') 
                  ? "bg-slate-300 text-slate-900" 
                  : "text-slate-700 hover:bg-slate-300/50 hover:text-slate-900"
              )}
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </li>
          
          {!loading && user && (
            <li>
              <Link 
                href="/invoices" 
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive('/invoices') 
                    ? "bg-slate-300 text-slate-900" 
                    : "text-slate-700 hover:bg-slate-300/50 hover:text-slate-900"
                )}
              >
                <FileText className="mr-2 h-4 w-4" />
                My Invoices
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="mt-auto p-4 border-t border-slate-300 bg-slate-200">
        {loading && <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-600" />}
        
        {!loading && user && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 truncate">{user.email}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout} 
              className="w-full justify-start bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
        
        {!loading && !user && (
          <div className="space-y-2">
            <Button variant="outline" size="sm" asChild className="w-full justify-start bg-white hover:bg-slate-100 border-slate-300 text-slate-700">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild className="w-full justify-start bg-blue-600 hover:bg-blue-700">
              <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
              </Link>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
