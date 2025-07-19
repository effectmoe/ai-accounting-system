// This is a sample file for testing refactoring
function processData(d) {
  let a = d.items;
  let b = [];
  
  for (let i = 0; i < a.length; i++) {
    let x = a[i];
    if (x.status === 'active') {
      if (x.value > 100) {
        if (x.type === 'premium') {
          b.push(x);
        }
      }
    }
  }
  
  // Duplicate code block
  for (let i = 0; i < a.length; i++) {
    let x = a[i];
    if (x.status === 'active') {
      if (x.value > 100) {
        if (x.type === 'premium') {
          console.log(x);
        }
      }
    }
  }
  
  return b;
}

// Long function that should be split
function handleUserRequest(req) {
  // Validation
  if (!req.userId) {
    throw new Error('User ID is required');
  }
  if (!req.action) {
    throw new Error('Action is required');
  }
  
  // Processing
  let result = null;
  if (req.action === 'create') {
    result = { id: Math.random(), status: 'created' };
  } else if (req.action === 'update') {
    result = { id: req.id, status: 'updated' };
  } else if (req.action === 'delete') {
    result = { id: req.id, status: 'deleted' };
  }
  
  // Logging
  console.log('Request processed:', req);
  console.log('Result:', result);
  
  // Notification
  if (result.status === 'created') {
    sendEmail(req.userId, 'Item created');
  } else if (result.status === 'updated') {
    sendEmail(req.userId, 'Item updated');
  } else if (result.status === 'deleted') {
    sendEmail(req.userId, 'Item deleted');
  }
  
  return result;
}

function sendEmail(userId, message) {
  console.log(`Sending email to ${userId}: ${message}`);
}