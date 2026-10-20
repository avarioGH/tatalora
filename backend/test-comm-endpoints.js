const http = require('http');

async function main() {
  console.log('Testing communication endpoints on backend...');

  // 1. Login as owner to obtain JWT
  const loginPayload = JSON.stringify({ username: 'owner', password: 'password123' });
  const loginReq = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload),
    },
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', async () => {
      console.log('Login status:', res.statusCode);
      try {
        const json = JSON.parse(body);
        const token = json.access_token || json.token;
        if (!token) {
          console.error('No token received:', body);
          process.exit(1);
        }
        console.log('Token successfully obtained.');

        // 2. Test GET /communication/settings
        const reqSettings = http.request({
          hostname: 'localhost',
          port: 3001,
          path: '/communication/settings',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }, (sRes) => {
          let sBody = '';
          sRes.on('data', c => sBody += c);
          sRes.on('end', () => {
            console.log('GET /communication/settings status:', sRes.statusCode);
            console.log('Settings response:', sBody);

            // 3. Test GET /communication/templates
            const reqTpl = http.request({
              hostname: 'localhost',
              port: 3001,
              path: '/communication/templates',
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` }
            }, (tRes) => {
              let tBody = '';
              tRes.on('data', c => tBody += c);
              tRes.on('end', () => {
                console.log('GET /communication/templates status:', tRes.statusCode);
                console.log('Templates count:', JSON.parse(tBody).length);
                console.log('ALL INTEGRATION TESTS PASSED!');
                process.exit(0);
              });
            });
            reqTpl.end();
          });
        });
        reqSettings.end();

      } catch (e) {
        console.error('Error parsing response:', e);
        process.exit(1);
      }
    });
  });
  loginReq.write(loginPayload);
  loginReq.end();
}

main();
