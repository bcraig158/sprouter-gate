#!/usr/bin/env node

// Test script to verify data collection is working
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8888/.netlify/functions/api';

async function testDataCollection() {
  console.log('🧪 Testing Sprouter Gate Data Collection...\n');
  
  try {
    // Test 1: Check API health
    console.log('1️⃣ Testing API health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ API Health:', healthData.status);
    console.log('📊 Available endpoints:', healthData.endpoints);
    
    // Test 2: Check debug data
    console.log('\n2️⃣ Testing debug data endpoint...');
    const debugResponse = await fetch(`${API_BASE}/debug-data`);
    const debugData = await debugResponse.json();
    
    if (debugData.success) {
      console.log('✅ Debug data retrieved successfully');
      console.log('📊 Data counts:');
      console.log(`   - User Logins: ${debugData.data.counts.userLogins}`);
      console.log(`   - Activities: ${debugData.data.counts.activities}`);
      console.log(`   - Sessions: ${debugData.data.counts.sessions}`);
      
      if (debugData.data.recentLogins.length > 0) {
        console.log('\n📋 Recent logins:');
        debugData.data.recentLogins.forEach(login => {
          console.log(`   - ${login.user_type}: ${login.user_id} at ${login.login_timestamp}`);
        });
      }
      
      if (debugData.data.recentActivities.length > 0) {
        console.log('\n📋 Recent activities:');
        debugData.data.recentActivities.forEach(activity => {
          console.log(`   - ${activity.activity_type}: ${activity.user_id} at ${activity.timestamp}`);
        });
      }
    } else {
      console.log('❌ Debug data failed:', debugData.error);
    }
    
    // Test 3: Test batch tracking endpoint
    console.log('\n3️⃣ Testing batch tracking endpoint...');
    const testBatchData = {
      activities: [{
        userId: 'TEST_USER_001',
        userType: 'student',
        activityType: 'page_view',
        page: '/test',
        metadata: { test: true }
      }],
      sessions: [{
        userId: 'TEST_USER_001',
        userType: 'student',
        sessionId: 'test_session_001',
        page: '/test',
        timeOnPage: 5000,
        referrer: 'https://test.com'
      }]
    };
    
    const batchResponse = await fetch(`${API_BASE}/track-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBatchData)
    });
    
    const batchResult = await batchResponse.json();
    if (batchResult.success) {
      console.log('✅ Batch tracking successful');
      console.log(`📊 Tracked: ${batchResult.activitiesTracked} activities, ${batchResult.sessionsTracked} sessions`);
    } else {
      console.log('❌ Batch tracking failed:', batchResult.error);
    }
    
    // Test 4: Verify data was stored
    console.log('\n4️⃣ Verifying data was stored...');
    const verifyResponse = await fetch(`${API_BASE}/debug-data`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      console.log('✅ Data verification successful');
      console.log('📊 Updated counts:');
      console.log(`   - User Logins: ${verifyData.data.counts.userLogins}`);
      console.log(`   - Activities: ${verifyData.data.counts.activities}`);
      console.log(`   - Sessions: ${verifyData.data.counts.sessions}`);
    }
    
    console.log('\n🎉 Data collection test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your Netlify dev server is running:');
    console.log('   cd netlify && netlify dev');
  }
}

// Run the test
testDataCollection();
