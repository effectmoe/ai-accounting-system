import fetch from 'node-fetch';

async function testDocumentAPI() {
  const documentId = '6880d623cd5c7448ad287751';
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log(`\nTesting API for document: ${documentId}`);
    console.log(`URL: ${baseUrl}/api/documents/${documentId}`);
    
    const response = await fetch(`${baseUrl}/api/documents/${documentId}`);
    const data = await response.json();
    
    console.log('\nAPI Response Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (data.success && data.document) {
      console.log('\nDocument received from API:');
      console.log('ID:', data.document.id);
      console.log('Document Type:', data.document.document_type);
      console.log('Receipt Type:', data.document.receipt_type);
      console.log('Facility Name:', data.document.facility_name);
      console.log('Entry Time:', data.document.entry_time);
      console.log('Exit Time:', data.document.exit_time);
      console.log('Parking Duration:', data.document.parking_duration);
      
      console.log('\nAll parking-related fields in API response:');
      const parkingFields = Object.keys(data.document).filter(key => 
        key.includes('parking') || 
        key.includes('facility') || 
        key.includes('entry') || 
        key.includes('exit') ||
        key.includes('receipt_type')
      );
      
      parkingFields.forEach(field => {
        console.log(`${field}: ${data.document[field]}`);
      });
      
      console.log('\nFull document object:');
      console.log(JSON.stringify(data.document, null, 2));
    } else {
      console.log('\nError or no document:', data);
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testDocumentAPI();