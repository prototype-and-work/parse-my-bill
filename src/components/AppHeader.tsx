
"use client";

import Link from 'next/link';
import { ReceiptText } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-slate-300 text-slate-800 border-b border-slate-400">
      <div className="px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-headline font-semibold">ParseMyBill</h1>
      </div>
    </header>
  );
}
