const http = require('http');

// Create a future date (1 hour from now)
const futureDate = new Date();
futureDate.setHours(futureDate.getHours() + 1);

const payload = JSON.stringify({
  dateTime: futureDate.toISOString()
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/scheduler/schedule-once',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const req = http.request(options, (res) => {
  console.log(`\nStatus: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

console.log('Sending request with dateTime:', futureDate.toISOString());
req.write(payload);
req.end();
