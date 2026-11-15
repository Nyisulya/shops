import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getSyncConfig, triggerBackgroundSync } from './syncService';

let listenersInitialized = false;

const sendTokenToServer = async (token: string, role: string, branchId?: string) => {
  try {
    const { apiUrl, apiKey } = getSyncConfig();
    await fetch(`${apiUrl}/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        token,
        role,
        branchId: branchId || null
      })
    });
  } catch (err) {
    console.warn('Push token register note:', err);
  }
};

export const registerForPushNotifications = async (role: string, branchId?: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    localStorage.setItem('push_last_role', role);
    if (branchId) localStorage.setItem('push_last_branch_id', branchId);

    // If token was already obtained earlier, update role/branch on server right away
    const cachedToken = localStorage.getItem('fcm_device_token');
    if (cachedToken) {
      await sendTokenToServer(cachedToken, role, branchId);
    }

    if (!listenersInitialized) {
      listenersInitialized = true;

      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'maduka_notifications',
          name: 'Taarifa za Maduka',
          description: 'Taarifa za mauzo mapya na mizigo mipya dukani',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true
        }).catch(() => {});
      }

      await PushNotifications.addListener('registration', async (tokenData) => {
        if (tokenData?.value) {
          localStorage.setItem('fcm_device_token', tokenData.value);
          const currentRole = localStorage.getItem('push_last_role') || role;
          const currentBranch = localStorage.getItem('push_last_branch_id') || branchId;
          await sendTokenToServer(tokenData.value, currentRole, currentBranch);
        }
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('FCM registration error:', err);
      });

      await PushNotifications.addListener('pushNotificationReceived', () => {
        // Refresh local data immediately when notification arrives in foreground
        triggerBackgroundSync();
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', () => {
        triggerBackgroundSync();
      });
    }

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn('Push setup note:', err);
  }
};
