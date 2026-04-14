fetch('http://localhost:3000/api/voices/cmnyzulvb0002a0jm6xtpno6d/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-test-secret': 'vox_super_test_secret',
    'x-test-user-id': 'cmnyzult10001a0jmoksq4n47'
  },
  body: JSON.stringify({ text: 'A' })
}).then(async r => {
  const html = await r.text();
  require('fs').writeFileSync('debug-error.html', html);
  console.log('Saved to debug-error.html');
}).catch(console.error);
