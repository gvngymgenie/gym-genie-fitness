const testPushSubscription = async () => {
  try {
    const response = await fetch('https://gym-genie-one.vercel.app/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId: 'test-player-id-12345',
        externalId: 'test-user-123',
        userAgent: 'Test Agent',
        userId: 'test-user-id',
        memberId: 'test-member-id'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response text (first 500 chars):', text.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.log('Failed to parse JSON, raw response:', text);
      return;
    }
    
    if (response.ok) {
      console.log('✅ Push subscription endpoint is working correctly!');
    } else {
      console.log('❌ Push subscription endpoint returned an error:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing push subscription endpoint:', error.message);
  }
};

testPushSubscription();