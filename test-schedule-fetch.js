// Test schedule-once endpoint
(async () => {
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 1);
  
  const payload = { dateTime: futureDate.toISOString() };
  
  console.log('Testing schedule-once with:', payload);
  
  try {
    const response = await fetch('http://127.0.0.1:3000/api/scheduler/schedule-once', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
