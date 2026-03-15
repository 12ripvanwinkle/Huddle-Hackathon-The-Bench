#!/usr/bin/env node
/**
 * Test script for MovementAnalyzer
 */

const { MovementAnalyzer } = require('../services/movementAnalyzer');

// Test data
const userId = 'test-user-123';
const sessionId = 'test-session-456';
const centerLat = 37.7749;
const centerLng = -122.4194;
const radius = 150;

// Create analyzer
const analyzer = new MovementAnalyzer(userId, sessionId, centerLat, centerLng, radius);

console.log('🧪 Testing MovementAnalyzer...\n');

// Test 1: Initial location (should return tracking started)
console.log('Test 1: Initial location');
const result1 = analyzer.analyzeMovement({ latitude: 37.7749, longitude: -122.4194 });
console.log('Result:', result1);
console.log();

// Test 2: Normal movement
console.log('Test 2: Normal movement (simulate 10 seconds later)');
setTimeout(() => {
  const result2 = analyzer.analyzeMovement({ latitude: 37.7750, longitude: -122.4195 });
  console.log('Result:', result2);
  console.log();

  // Test 3: High speed (simulate fast movement)
  console.log('Test 3: High speed movement');
  setTimeout(() => {
    const result3 = analyzer.analyzeMovement({ latitude: 37.7800, longitude: -122.4200 }); // Much further
    console.log('Result:', result3);
    console.log();

    // Test 4: Stationary (same location)
    console.log('Test 4: Stationary detection');
    setTimeout(() => {
      const result4 = analyzer.analyzeMovement({ latitude: 37.7800, longitude: -122.4200 }); // Same location
      console.log('Result:', result4);
      console.log();

      // Test 5: Boundary exit
      console.log('Test 5: Boundary exit');
      const result5 = analyzer.analyzeMovement({ latitude: 37.7900, longitude: -122.4300 }); // Outside radius
      console.log('Result:', result5);
      console.log();

      // Test 6: Proximity meeting (with mock members)
      console.log('Test 6: Proximity meeting');
      const mockMembers = [
        {
          user_id: 'other-user-1',
          latitude: 37.7901, // Very close
          longitude: -122.4301,
          profiles: { username: 'Alice' }
        }
      ];
      const result6 = analyzer.analyzeMovement(
        { latitude: 37.7900, longitude: -122.4300 },
        mockMembers
      );
      console.log('Result:', result6);
      console.log();

      console.log('✅ MovementAnalyzer tests completed!');
    }, 100);
  }, 100);
}, 100);