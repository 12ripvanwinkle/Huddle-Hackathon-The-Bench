// import { Alert } from 'react-native';
// import * as Notifications from 'expo-notifications';
// import { supabase } from './supabase';

// // Configure notification handler globally
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

// export class NotificationService {
//   static async initialize() {
//     // Request notification permissions
//     const { status } = await Notifications.requestPermissionsAsync();
//     if (status !== 'granted') {
//       console.warn('Notification permissions not granted');
//       return null;
//     }

//     // Get push token
//     const token = (await Notifications.getExpoPushTokenAsync()).data;
//     return token;
//   }

//   /**
//    * Send a notification to group members
//    * Works for both app-open (Realtime) and app-closed (Push) scenarios
//    */
//   static async sendGroupNotification({
//     sessionId,
//     userId,
//     title,
//     message,
//     riskLevel = 'info',
//     data = {},
//   }) {
//     if (!sessionId || !userId || !message) {
//       console.error('Missing required notification params');
//       return false;
//     }

//     try {
//       // Step 1: Store alert in Supabase
//       // This triggers Realtime subscribers (phones with app open)
//       const { error: dbError } = await supabase
//         .from('group_alerts')
//         .insert({
//           session_id: sessionId,
//           user_id: userId,
//           alert_message: message,
//           alert_title: title || 'Alert',
//           risk_level: riskLevel,
//           ...data,
//         });

//       if (dbError) {
//         console.error('Failed to store alert:', dbError);
//         return false;
//       }

//       // Step 2: Get all group members' push tokens
//       // (for phones with app closed or Realtime subscription not active)
//       const { data: members, error: membersError } = await supabase
//         .from('huddle_members')
//         .select('user_id, user:auth.users(id)')
//         .eq('session_id', sessionId)
//         .neq('user_id', userId); // Don't notify the sender

//       if (membersError) {
//         console.error('Failed to fetch group members:', membersError);
//         // Still return true since alert was stored in DB
//         return true;
//       }

//       // Step 3: Get push tokens for members
//       const memberIds = members?.map(m => m.user_id) || [];
//       if (memberIds.length === 0) {
//         // No other members, just database storage is fine
//         return true;
//       }

//       const { data: pushTokens, error: tokensError } = await supabase
//         .from('user_profiles')
//         .select('push_token')
//         .in('id', memberIds)
//         .not('push_token', 'is', null);

//       if (tokensError) {
//         console.error('Failed to fetch push tokens:', tokensError);
//         return true; // Alert still stored in DB
//       }

//       const tokens = pushTokens?.map(t => t.push_token).filter(Boolean) || [];

//       // Step 4: Send push notifications
//       if (tokens.length > 0) {
//         await this._sendPushNotifications(tokens, title, message, riskLevel, data);
//       }

//       return true;
//     } catch (error) {
//       console.error('Notification service error:', error);
//       return false;
//     }
//   }

//   /**
//    * Send push notifications via Expo
//    */
//   static async _sendPushNotifications(tokens, title, message, riskLevel, data) {
//     try {
//       const response = await fetch('https://exp.host/--/api/v2/push/send', {
//         method: 'POST',
//         headers: {
//           Accept: 'application/json',
//           'Accept-encoding': 'gzip, deflate',
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           to: tokens,
//           sound: 'default',
//           title: title || 'Alert',
//           body: message,
//           data: {
//             riskLevel,
//             ...data,
//           },
//           priority: riskLevel === 'danger' ? 'high' : 'default',
//           ttl: 600, // 10 minutes
//         }),
//       });

//       const result = await response.json();
//       if (!response.ok) {
//         console.warn('Push notification service error:', result);
//       }
//       return result;
//     } catch (error) {
//       console.error('Failed to send push notifications:', error);
//       throw error;
//     }
//   }

//   /**
//    * Show local alert (fallback/immediate feedback)
//    */
//   static showAlert(title, message, riskLevel = 'info') {
//     const colors = {
//       danger: '#FF4444',
//       warning: '#FFAA00',
//       info: '#4499FF',
//       success: '#44AA44',
//     };

//     Alert.alert(
//       `${riskLevel === 'danger' ? '🚨' : riskLevel === 'warning' ? '⚠️' : 'ℹ️'} ${title}`,
//       message,
//       [{ text: 'OK', onPress: () => {} }],
//       { cancelable: true }
//     );
//   }

//   /**
//    * Listen to real-time alerts (Supabase Realtime)
//    * Call this once in MapScreen useEffect
//    */
//   static listenToGroupAlerts(sessionId, onAlertReceived) {
//     if (!sessionId) {
//       console.error('Cannot listen to alerts without sessionId');
//       return null;
//     }

//     const channel = supabase
//       .channel(`alerts:session_${sessionId}`)
//       .on(
//         'postgres_changes',
//         {
//           event: 'INSERT',
//           schema: 'public',
//           table: 'group_alerts',
//           filter: `session_id=eq.${sessionId}`,
//         },
//         (payload) => {
//           const alert = payload.new;
//           // Callback with alert data
//           onAlertReceived(alert);
//         }
//       )
//       .subscribe();

//     return channel; // Return for cleanup
//   }

//   /**
//    * Stop listening to alerts
//    * Call in useEffect cleanup
//    */
//   static stopListeningToAlerts(channel) {
//     if (channel) {
//       channel.unsubscribe();
//     }
//   }

//   /**
//    * Handle incoming notification when app is resumed from background
//    */
//   static setupNotificationListener(onNotification) {
//     const subscription = Notifications.addNotificationResponseListener(
//       (response) => {
//         const alert = response.notification.request.content.data;
//         onNotification(alert);
//       }
//     );

//     return subscription; // Return for cleanup
//   }
// }
