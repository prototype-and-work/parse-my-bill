
"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ReceiptText, LogOut, LogIn, UserPlus, Loader2 } from 'lucide-react';

export function AppHeader() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <ReceiptText size={32} className="mr-3" />
          <h1 className="text-2xl font-headline font-semibold">ParseMyBill</h1>
        </Link>
        
        <div className="flex items-center space-x-3">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {!loading && user && (
            <>
              <span className="text-sm hidden sm:inline">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="hover:bg-primary/80 text-primary-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          )}
          {!loading && !user && (
            <>
              <Button variant="outline" size="sm" asChild className="border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/signup">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
