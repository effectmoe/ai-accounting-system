import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('accounting');
    
    const results: any = {
      invoices: {
        documents: [],
        total: 0,
        count: 0
      },
      quotes: {
        documents: [],
        total: 0,
        count: 0,
        possibleSupplierQuotes: []
      },
      supplierQuotes: {
        documents: [],
        total: 0,
        count: 0
      },
      purchaseInvoices: {
        documents: [],
        total: 0,
        count: 0
      }
    };
    
    // Investigate invoices collection
    const invoices = await db.collection('invoices').find({}).toArray();
    results.invoices.documents = invoices.map(invoice => ({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: invoice.amount,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate
    }));
    results.invoices.count = invoices.length;
    results.invoices.total = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Investigate quotes collection
    const quotes = await db.collection('quotes').find({}).toArray();
    results.quotes.documents = quotes.map(quote => ({
      _id: quote._id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      amount: quote.amount,
      status: quote.status,
      quoteDate: quote.quoteDate,
      supplierName: quote.supplierName,
      type: quote.type
    }));
    results.quotes.count = quotes.length;
    results.quotes.total = quotes.reduce((sum, quote) => sum + (quote.amount || 0), 0);
    
    // Check for possible supplier quotes in quotes collection
    results.quotes.possibleSupplierQuotes = quotes.filter(quote => 
      quote.supplierName || quote.type === 'supplier'
    );
    
    // Investigate supplierQuotes collection
    const supplierQuotes = await db.collection('supplierQuotes').find({}).toArray();
    results.supplierQuotes.documents = supplierQuotes.map(quote => ({
      _id: quote._id,
      quoteNumber: quote.quoteNumber,
      supplierName: quote.supplierName,
      amount: quote.amount,
      status: quote.status,
      quoteDate: quote.quoteDate
    }));
    results.supplierQuotes.count = supplierQuotes.length;
    results.supplierQuotes.total = supplierQuotes.reduce((sum, quote) => sum + (quote.amount || 0), 0);
    
    // Investigate purchaseInvoices collection
    const purchaseInvoices = await db.collection('purchaseInvoices').find({}).toArray();
    results.purchaseInvoices.documents = purchaseInvoices.map(invoice => ({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplierName,
      amount: invoice.amount,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate
    }));
    results.purchaseInvoices.count = purchaseInvoices.length;
    results.purchaseInvoices.total = purchaseInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Calculate summaries
    const summary = {
      invoicesTotal: results.invoices.total,
      quotesTotal: results.quotes.total,
      supplierQuotesTotal: results.supplierQuotes.total,
      purchaseInvoicesTotal: results.purchaseInvoices.total,
      dashboardShowing: 4616800,
      possibleCombinations: {
        invoicesPlusQuotes: results.invoices.total + results.quotes.total,
        invoicesPlusQuotesPlusSupplier: results.invoices.total + results.quotes.total + results.supplierQuotes.total,
        allCollections: results.invoices.total + results.quotes.total + results.supplierQuotes.total + results.purchaseInvoices.total
      }
    };
    
    return NextResponse.json({
      results,
      summary,
      analysis: {
        matchesDashboard: Object.entries(summary.possibleCombinations).find(([_, value]) => value === 4616800)?.[0] || 'No match found'
      }
    });
  } catch (error) {
    console.error('Database investigation error:', error);
    return NextResponse.json({ error: 'Failed to investigate database' }, { status: 500 });
  }
}