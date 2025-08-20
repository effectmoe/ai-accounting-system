import PDFDocument from 'pdfkit';

console.log('PDFKit loaded:', !!PDFDocument);

// Simple test
const doc = new PDFDocument();
const chunks: Buffer[] = [];

doc.on('data', chunk => chunks.push(chunk));
doc.on('end', () => {
  const pdfBuffer = Buffer.concat(chunks);
  console.log('PDF generated, size:', pdfBuffer.length);
  console.log('First bytes:', pdfBuffer.slice(0, 10).toString());
});

doc.fontSize(20).text('Test PDF', 100, 100);
doc.end();