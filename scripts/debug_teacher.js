const http = require('http');

http.get('http://localhost:3000/api/dashboard/teacher', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', (e) => console.error(e));
