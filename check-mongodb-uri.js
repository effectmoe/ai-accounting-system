require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
console.log('MONGODB_URI:', uri);

// Parse the URI to check the format
if (uri) {
  try {
    const url = new URL(uri);
    console.log('Protocol:', url.protocol);
    console.log('Username:', url.username);
    console.log('Host:', url.hostname);
    console.log('Path:', url.pathname);
  } catch (error) {
    console.error('Error parsing URI:', error.message);
  }
}