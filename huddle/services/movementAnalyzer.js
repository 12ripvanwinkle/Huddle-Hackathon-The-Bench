// import { GoogleGenerativeAI } from "@google/generative-ai";

// // Movement thresholds
// const DANGER_VELOCITY = 30; 
// const STATIONARY_TIMEOUT = 300000; 
// const ALERT_COOLDOWN = 60000; 

// // Initialize Gemini (free tier)
// // Get your free API key at: https://makersuite.google.com/app/apikey
// const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

// export class MovementAnalyzer {
//   constructor() {
//     this.prevLocation = null;
//     this.prevTime = null;
//     this.stationaryStartTime = null;
//     this.lastAlertTime = 0;
//     this.velocityHistory = [];
//   }

//   // Calculate velocity between two locations
//   calculateVelocity(prevLoc, currLoc, timeDeltaMs) {
//     if (!prevLoc) return 0;

//     // Haversine formula
//     const R = 6371; // km
//     const dLat = (currLoc.latitude - prevLoc.latitude) * (Math.PI / 180);
//     const dLon = (currLoc.longitude - prevLoc.longitude) * (Math.PI / 180);
    
//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos(prevLoc.latitude * (Math.PI / 180)) *
//         Math.cos(currLoc.latitude * (Math.PI / 180)) *
//         Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     const distanceKm = R * c;
    
//     const timeHours = timeDeltaMs / (1000 * 60 * 60);
//     const velocity = distanceKm / timeHours;
    
//     return velocity;
//   }

//   // Analyze current movement
//   analyzeMovement(currentLocation) {
//     const currentTime = Date.now();
    
//     if (!this.prevLocation || !this.prevTime) {
//       this.prevLocation = currentLocation;
//       this.prevTime = currentTime;
//       return {
//         velocity: 0,
//         isMoving: false,
//         riskLevel: "safe",
//         message: "Tracking started"
//       };
//     }

//     const timeDelta = currentTime - this.prevTime;
//     const velocity = this.calculateVelocity(this.prevLocation, currentLocation, timeDelta);
    
//     // Keep history for trend analysis (last 10 readings)
//     this.velocityHistory.push({ velocity, time: currentTime });
//     if (this.velocityHistory.length > 10) {
//       this.velocityHistory.shift();
//     }

//     // Determine movement status
//     const isMoving = velocity > 0.5; // > 0.5 km/h
//     let riskLevel = "safe";
//     let message = "Normal movement";

//     if (velocity > DANGER_VELOCITY) {
//       riskLevel = "danger";
//       message = `DANGER: Moving at ${velocity.toFixed(1)} km/h!`;
//     } else if (velocity > 20) {
//       riskLevel = "warning";
//       message = `Fast movement: ${velocity.toFixed(1)} km/h`;
//     }

//     // Track stationary time
//     if (!isMoving) {
//       if (!this.stationaryStartTime) {
//         this.stationaryStartTime = currentTime;
//       }
//       const stationaryTime = currentTime - this.stationaryStartTime;
//       if (stationaryTime > STATIONARY_TIMEOUT) {
//         riskLevel = riskLevel === "danger" ? "danger" : "warning";
//         message = `⚠️ Stationary for ${(stationaryTime / 60000).toFixed(0)} minutes`;
//       }
//     } else {
//       this.stationaryStartTime = null;
//     }

//     this.prevLocation = currentLocation;
//     this.prevTime = currentTime;

//     return {
//       velocity: parseFloat(velocity.toFixed(2)),
//       isMoving,
//       riskLevel,
//       message,
//       stationarySeconds: this.stationaryStartTime 
//         ? Math.floor((currentTime - this.stationaryStartTime) / 1000)
//         : 0
//     };
//   }

//   // Generate alert using Gemini (FREE API)
//   async generateAlert(userData, movementData) {
//     // Rate limit alerts
//     if (Date.now() - this.lastAlertTime < ALERT_COOLDOWN) {
//       return null;
//     }

//     try {
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//       const prompt = `You are a safety alert generator for a group location app. 
      
// User: ${userData.name || userData.email}
// Risk Level: ${movementData.riskLevel}
// Velocity: ${movementData.velocity} km/h (threshold: ${DANGER_VELOCITY} km/h)
// Stationary Time: ${movementData.stationarySeconds} seconds
// Location: ${movementData.latitude.toFixed(4)}, ${movementData.longitude.toFixed(4)}

// Generate ONE SHORT safety alert (max 15 words) for the group chat. Be urgent if danger, casual if warning. Include emoji.
// Example: "🚨 Alex is speeding at 45 km/h downtown!"`;

//       const result = await model.generateContent(prompt);
//       const text = result.response.text();
      
//       this.lastAlertTime = Date.now();
//       return text;
//     } catch (error) {
//       console.error('Gemini API error:', error);
//       // Fallback alert if API fails
//       return `⚠️ Movement Alert: ${movementData.message}`;
//     }
//   }

//   // Get risk summary
//   getRiskSummary() {
//     if (this.velocityHistory.length === 0) return "No data";

//     const avgVelocity = 
//       this.velocityHistory.reduce((sum, v) => sum + v.velocity, 0) / 
//       this.velocityHistory.length;

//     return {
//       averageVelocity: avgVelocity.toFixed(2),
//       maxVelocity: Math.max(...this.velocityHistory.map(v => v.velocity)).toFixed(2),
//       readingCount: this.velocityHistory.length
//     };
//   }
// }
