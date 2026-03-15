// import { GoogleGenerativeAI } from "@google/generative-ai";

// Movement thresholds
const DANGER_VELOCITY = 30; // km/h - considered dangerous speed
const HIGH_SPEED_THRESHOLD = 20; // km/h - fast but not dangerous
const STATIONARY_TIMEOUT = 300000; // 5 minutes in milliseconds
const ALERT_COOLDOWN = 60000; // 1 minute between alerts
const PROXIMITY_THRESHOLD = 50; // meters - close proximity for meeting detection
const BOUNDARY_BUFFER = 10; // meters - buffer zone before boundary alert

// // Initialize Gemini (free tier)
// // Get your free API key at: https://makersuite.google.com/app/apikey
const genAI = null; // Temporarily disabled for testing
export const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) * R;
};

export class MovementAnalyzer {
  constructor(userId, sessionId, centerLat, centerLng, radius) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.centerLat = centerLat;
    this.centerLng = centerLng;
    this.radius = radius;

    this.prevLocation = null;
    this.prevTime = null;
    this.stationaryStartTime = null;
    this.lastAlertTime = 0;
    this.velocityHistory = [];
    this.boundaryCrossed = false; // Track if user has left boundary
    this.lastProximityCheck = 0;
    this.proximityCooldown = 30000; // 30 seconds between proximity alerts
  }

  // Update session context (called when session changes)
  updateSession(centerLat, centerLng, radius) {
    this.centerLat = centerLat;
    this.centerLng = centerLng;
    this.radius = radius;
    this.boundaryCrossed = false; // Reset boundary status when session changes
  }

  // Calculate velocity between two locations
  calculateVelocity(prevLoc, currLoc, timeDeltaMs) {
    if (!prevLoc || !currLoc) return 0;

    const distanceKm = getDistanceMeters(prevLoc.latitude, prevLoc.longitude, currLoc.latitude, currLoc.longitude);
    const timeHours = timeDeltaMs / (1000 * 60 * 60);
    return timeHours > 0 ? distanceKm / timeHours : 0;
  }

  // Check if user is near huddle boundary
  isNearBoundary(latitude, longitude) {
    const distanceFromCenter = getDistanceMeters(this.centerLat, this.centerLng, latitude, longitude);
    return Math.abs(distanceFromCenter - this.radius) <= BOUNDARY_BUFFER;
  }

  // Check if user has left huddle boundary
  hasLeftBoundary(latitude, longitude) {
    const distanceFromCenter = getDistanceMeters(this.centerLat, this.centerLng, latitude, longitude);
    return distanceFromCenter > this.radius;
  }

  // Analyze current movement and generate alerts
  analyzeMovement(currentLocation, allMembers = []) {
    const currentTime = Date.now();

    if (!this.prevLocation || !this.prevTime) {
      this.prevLocation = currentLocation;
      this.prevTime = currentTime;
      return {
        velocity: 0,
        isMoving: false,
        riskLevel: "safe",
        alerts: [],
        message: "Tracking started"
      };
    }

    const timeDelta = currentTime - this.prevTime;
    const velocity = this.calculateVelocity(this.prevLocation, currentLocation, timeDelta);

    // Update velocity history
    this.velocityHistory.push({ velocity, time: currentTime });
    if (this.velocityHistory.length > 10) {
      this.velocityHistory.shift();
    }

    const alerts = [];
    let riskLevel = "safe";
    let message = "Normal movement";

    // 1. HIGH SPEED DETECTION
    if (velocity > DANGER_VELOCITY) {
      riskLevel = "danger";
      message = `🚨 DANGER: Moving at ${velocity.toFixed(1)} km/h!`;
      alerts.push({
        type: "high_speed",
        severity: "danger",
        message: `High speed: ${velocity.toFixed(1)} km/h`,
        emoji: "🚨"
      });
    } else if (velocity > HIGH_SPEED_THRESHOLD) {
      if (riskLevel === "safe") riskLevel = "warning";
      message = `Fast movement: ${velocity.toFixed(1)} km/h`;
      alerts.push({
        type: "high_speed",
        severity: "warning",
        message: `Moving fast: ${velocity.toFixed(1)} km/h`,
        emoji: "💨"
      });
    }

    // 2. COMPLETE IDLENESS DETECTION
    const isMoving = velocity > 0.5; // > 0.5 km/h
    if (!isMoving) {
      if (!this.stationaryStartTime) {
        this.stationaryStartTime = currentTime;
      }
      const stationaryTime = currentTime - this.stationaryStartTime;
      if (stationaryTime > STATIONARY_TIMEOUT) {
        if (riskLevel === "safe") riskLevel = "warning";
        message = `⚠️ Stationary for ${(stationaryTime / 60000).toFixed(0)} minutes`;
        alerts.push({
          type: "idleness",
          severity: "warning",
          message: `Stationary for ${(stationaryTime / 60000).toFixed(0)} minutes`,
          emoji: "😐"
        });
      }
    } else {
      this.stationaryStartTime = null;
    }

    // 3. LEAVING HUDDLE BOUNDARY DETECTION
    const currentlyOutside = this.hasLeftBoundary(currentLocation.latitude, currentLocation.longitude);
    if (currentlyOutside && !this.boundaryCrossed) {
      this.boundaryCrossed = true;
      if (riskLevel === "safe") riskLevel = "warning";
      alerts.push({
        type: "boundary_exit",
        severity: "warning",
        message: "Left huddle zone",
        emoji: "⚠️"
      });
    } else if (!currentlyOutside && this.boundaryCrossed) {
      // User returned to zone
      this.boundaryCrossed = false;
      alerts.push({
        type: "boundary_return",
        severity: "info",
        message: "Returned to huddle zone",
        emoji: "✅"
      });
    }

    // 4. MEMBERS MEETING UP DETECTION (close proximity)
    if (currentTime - this.lastProximityCheck > this.proximityCooldown) {
      this.lastProximityCheck = currentTime;
      const nearbyMembers = allMembers.filter(member => {
        if (member.user_id === this.userId) return false;
        if (!member.latitude || !member.longitude) return false;

        const distance = getDistanceMeters(
          currentLocation.latitude, currentLocation.longitude,
          member.latitude, member.longitude
        );
        return distance <= PROXIMITY_THRESHOLD;
      });

      if (nearbyMembers.length > 0) {
        const names = nearbyMembers.map(m => m.profiles?.username || 'Someone').join(', ');
        alerts.push({
          type: "proximity_meeting",
          severity: "info",
          message: `Close to: ${names}`,
          emoji: "🤝"
        });
      }
    }

    this.prevLocation = currentLocation;
    this.prevTime = currentTime;

    return {
      velocity: parseFloat(velocity.toFixed(2)),
      isMoving,
      riskLevel,
      alerts,
      message,
      stationarySeconds: this.stationaryStartTime
        ? Math.floor((currentTime - this.stationaryStartTime) / 1000)
        : 0,
      boundaryStatus: this.boundaryCrossed ? "outside" : "inside"
    };
  }

  // Generate alert using Gemini (FREE API)
  async generateAlert(userData, movementData, alertType) {
    // Rate limit alerts
    if (Date.now() - this.lastAlertTime < ALERT_COOLDOWN) {
      return null;
    }

    // If Gemini is not available, use fallback alerts
    if (!genAI) {
      this.lastAlertTime = Date.now();
      return this.getFallbackAlert(userData, movementData, alertType);
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      let contextPrompt = "";
      switch (alertType) {
        case "high_speed":
          contextPrompt = `User is moving dangerously fast at ${movementData.velocity} km/h. Generate an urgent safety alert.`;
          break;
        case "idleness":
          contextPrompt = `User has been completely stationary for ${movementData.stationarySeconds} seconds. Check if they need assistance.`;
          break;
        case "boundary_exit":
          contextPrompt = `User has left the huddle safety zone. They are now outside the designated area.`;
          break;
        case "proximity_meeting":
          contextPrompt = `User is now in close proximity to other huddle members. This could indicate a safe meeting or gathering.`;
          break;
        default:
          contextPrompt = `General movement alert for user.`;
      }

      const prompt = `You are a safety alert generator for a group location app called Huddle.

${contextPrompt}

User: ${userData.name || userData.email || 'Member'}
Risk Level: ${movementData.riskLevel}
Velocity: ${movementData.velocity} km/h
Stationary Time: ${movementData.stationarySeconds} seconds
Boundary Status: ${movementData.boundaryStatus}

Generate ONE SHORT safety alert (max 15 words) for the group chat. Be urgent if danger, casual if info. Include emoji.
Examples:
- "🚨 Alex speeding at 45 km/h downtown!"
- "⚠️ Jordan hasn't moved for 10 minutes"
- "🤝 Sarah met up with Mike nearby"
- "✅ Tom returned to the huddle zone"`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      this.lastAlertTime = Date.now();
      return text;
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback alerts based on type
      switch (alertType) {
        case "high_speed":
          return `🚨 ${userData.name || 'Member'} moving at ${movementData.velocity} km/h!`;
        case "idleness":
          return `⚠️ ${userData.name || 'Member'} stationary for ${Math.floor(movementData.stationarySeconds / 60)} minutes`;
        case "boundary_exit":
          return `⚠️ ${userData.name || 'Member'} left huddle zone`;
        case "proximity_meeting":
          return `🤝 ${userData.name || 'Member'} met up with others nearby`;
        default:
          return `⚠️ Movement Alert: ${movementData.message}`;
      }
    }
  }

  // Fallback alert generation when Gemini is not available
  getFallbackAlert(userData, movementData, alertType) {
    const name = userData.name || 'Member';
    switch (alertType) {
      case "high_speed":
        return `🚨 ${name} moving at ${movementData.velocity} km/h!`;
      case "idleness":
        return `⚠️ ${name} stationary for ${Math.floor(movementData.stationarySeconds / 60)} minutes`;
      case "boundary_exit":
        return `⚠️ ${name} left huddle zone`;
      case "proximity_meeting":
        return `🤝 ${name} met up with others nearby`;
      case "boundary_return":
        return `✅ ${name} returned to huddle zone`;
      default:
        return `⚠️ Movement Alert: ${movementData.message}`;
    }
  }

  // Get risk summary
  getRiskSummary() {
    if (this.velocityHistory.length === 0) return "No data";

    const avgVelocity = 
      this.velocityHistory.reduce((sum, v) => sum + v.velocity, 0) / 
      this.velocityHistory.length;

    return {
      averageVelocity: avgVelocity.toFixed(2),
      maxVelocity: Math.max(...this.velocityHistory.map(v => v.velocity)).toFixed(2),
      readingCount: this.velocityHistory.length
    };
  }
}
