import { ReceiptText } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <ReceiptText size={32} className="mr-3" />
        <h1 className="text-2xl font-headline font-semibold">ParseMyBill</h1>
      </div>
    </header>
  );
}
