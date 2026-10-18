const http = require('http');

const urls = [
  '/',
  '/akueb',
  '/akueb/IX',
  '/akueb/IX/physics',
  '/akueb/IX/physics/pastpapers',
  '/akueb/IX/physics/model-papers',
  '/akueb/IX/physics/syllabus',
  '/akueb/IX/physics/mcqs',
  '/akueb/IX/physics/books',
  '/akueb/IX/physics/practicals',
  '/akueb/X',
  '/akueb/X/physics',
  '/classes/ssc-i/physics'
];

async function checkUrl(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, size: data.length });
      });
    });
    req.on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing Academic Hierarchy Routes...');
  for (const url of urls) {
    const result = await checkUrl(url);
    if (result.status === 200) {
      console.log(`✅ [200 OK] ${result.path} (${result.size} bytes)`);
    } else {
      console.log(`❌ [FAIL] ${result.path} -> Status: ${result.status || result.error}`);
    }
  }
}

run();
