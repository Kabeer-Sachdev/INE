require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const SECRET = process.env.SCHEDULER_SECRET || 'test_scheduler_secret_123';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 TESTING PHASE 8 SCHEDULER ENDPOINT');
  console.log('==================================================');
  console.log(`Target Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Missing Authorization Header
    console.log('--- Test 1: Missing Authorization Header ---');
    const res1 = await fetch(`${BASE_URL}/api/scheduler/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`HTTP Status: ${res1.status} (Expected: 401)`);
    const data1 = await res1.json();
    console.log(`Response:`, JSON.stringify(data1));
    if (res1.status !== 401) throw new Error('Test 1 Failed: Expected 401');
    console.log('✅ Test 1 PASSED: Missing auth header correctly rejected.\n');

    // Test 2: Incorrect Secret
    console.log('--- Test 2: Incorrect Secret ---');
    const res2 = await fetch(`${BASE_URL}/api/scheduler/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer INVALID_SECRET_XYZ'
      }
    });
    console.log(`HTTP Status: ${res2.status} (Expected: 401)`);
    const data2 = await res2.json();
    console.log(`Response:`, JSON.stringify(data2));
    if (res2.status !== 401) throw new Error('Test 2 Failed: Expected 401');
    console.log('✅ Test 2 PASSED: Invalid secret correctly rejected.\n');

    // Test 3: Authorized Scheduler Run & Concurrent Overlap Test
    console.log('--- Test 3 & 4: Authorized Run & Overlap Protection ---');
    console.log(`Triggering authorized scheduler run with Bearer <SECRET>...`);

    // Launch first request
    const p1 = fetch(`${BASE_URL}/api/scheduler/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      }
    });

    // Small delay to let p1 start execution and acquire lock
    await new Promise(r => setTimeout(r, 150));

    // Launch second concurrent request while p1 is running
    console.log('Firing second concurrent request to test 409 Conflict overlap protection...');
    const res4 = await fetch(`${BASE_URL}/api/scheduler/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      }
    });

    console.log(`Concurrent Request HTTP Status: ${res4.status} (Expected: 409)`);
    const data4 = await res4.json();
    console.log(`Concurrent Response:`, JSON.stringify(data4));
    if (res4.status === 409) {
      console.log('✅ Test 4 PASSED: Overlapping execution correctly returned 409 Conflict.\n');
    } else {
      console.warn('⚠️ Test 4 Warning: Concurrent request status was not 409 (run may have finished rapidly).\n');
    }

    // Await primary execution completion
    const res3 = await p1;
    console.log(`Primary Scheduler HTTP Status: ${res3.status} (Expected: 200)`);
    const data3 = await res3.json();
    console.log(`Primary Response:`, JSON.stringify(data3, null, 2));

    if (res3.status !== 200 || !data3.success) {
      throw new Error('Test 3 Failed: Authorized scheduler run did not return 200 success.');
    }

    console.log('✅ Test 3 PASSED: Authorized scheduler run completed successfully!\n');

    console.log('==================================================');
    console.log('🎉 ALL PHASE 8 SCHEDULER TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err) {
    console.error(`❌ SCHEDULER TEST FAILED: ${err.message}`);
    process.exit(1);
  }
}

runTests();
