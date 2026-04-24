const http = require('http');

const INTERVAL = 5 * 60 * 1000; // 5분
const API_URL = 'http://localhost:3000/api/cron/update-metrics';

function triggerUpdate() {
  console.log(`[${new Date().toLocaleTimeString()}] Triggering metrics update...`);
  
  http.get(API_URL, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`[${new Date().toLocaleTimeString()}] Result:`, json.message || json.error || 'Done');
      } catch (e) {
        console.log(`[${new Date().toLocaleTimeString()}] Error parsing response`);
      }
    });
  }).on('error', (err) => {
    console.error(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
    console.log('Is the Next.js server running on http://localhost:3000?');
  });
}

console.log('Pulse60 Metrics Scheduler Started!');
console.log(`Target: ${API_URL}`);
console.log(`Interval: ${INTERVAL / 1000 / 60} minutes`);
console.log('------------------------------------------');

// 즉시 한 번 실행 후 주기적으로 실행
triggerUpdate();
setInterval(triggerUpdate, INTERVAL);
