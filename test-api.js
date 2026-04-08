#!/usr/bin/env node

// Simple test script to check API endpoints
import https from 'https';
import http from 'http';

const testEndpoints = [
  { method: 'GET', url: 'http://localhost:5000/api/leads', name: 'Leads API' },
  { method: 'GET', url: 'http://localhost:5000/api/members', name: 'Members API' },
  { method: 'GET', url: 'http://localhost:5000/api/staff', name: 'Staff API' },
  { method: 'GET', url: 'http://localhost:5000/api/inventory', name: 'Inventory API' },
  { method: 'GET', url: 'http://localhost:5000/api/plans', name: 'Plans API' }
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing ${endpoint.name}...`);
    console.log(`   URL: ${endpoint.url}`);
    
    const url = new URL(endpoint.url);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: endpoint.method,
      headers: {
        'User-Agent': 'API Test Script'
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response length: ${data.length} bytes`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`   ✅ Success - Found ${Array.isArray(jsonData) ? jsonData.length : '1'} record(s)`);
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              console.log(`   📋 Sample data: ${JSON.stringify(jsonData[0], null, 2).substring(0, 200)}...`);
            }
          } catch (e) {
            console.log(`   ⚠️  Response is not JSON: ${data.substring(0, 100)}...`);
          }
        } else {
          console.log(`   ❌ Error: ${data.substring(0, 200)}...`);
        }
        
        resolve({ success: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode });
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Connection Error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      console.log(`   ⏰ Timeout after 5 seconds`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests\n');
  console.log('Note: If you see "Connection Error", the server might not be running or there might be a port conflict.\n');
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ ...endpoint, ...result });
  }
  
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status || 'Error'}`);
    if (result.success) successCount++;
  }
  
  console.log('='.repeat(50));
  console.log(`🎯 Success Rate: ${successCount}/${results.length} (${Math.round((successCount/results.length)*100)}%)`);
  
  if (successCount === 0) {
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Make sure the server is running: npm run dev');
    console.log('2. Check if port 5000 is available: lsof -i :5000');
    console.log('3. Try restarting the server');
    console.log('4. Check the server logs for any errors');
  }
}

runTests().catch(console.error);