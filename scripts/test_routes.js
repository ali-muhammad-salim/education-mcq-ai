const http = require('http');

const urls = [
  '/dashboard/student',
  '/dashboard/teacher',
  '/api/dashboard/student',
  '/api/dashboard/teacher',
  '/teacher/quizzes/builder',
  '/quizzes'
];


async function check(url) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${url}`, (res) => {
      console.log(`${url} -> HTTP ${res.statusCode}`);
      resolve();
    }).on('error', (e) => {
      console.log(`${url} -> Error: ${e.message}`);
      resolve();
    });
  });
}

async function main() {
  for (const u of urls) {
    await check(u);
  }
}

main();
