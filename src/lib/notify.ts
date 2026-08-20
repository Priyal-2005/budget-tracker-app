import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { BufferStatus } from '@/lib/buffer-status';
import { formatINR } from '@/lib/currency';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Permission is asked for the first time a warning would actually fire, rather
// than on first launch, so the prompt arrives with a reason attached.
async function ensurePermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  if (status === 'denied') return false;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

export async function notifyBufferStatus(status: BufferStatus, remaining: number) {
  if (status !== 'low' && status !== 'over') return;
  // expo-notifications needs extra setup to deliver on web, and the app is
  // meant for phones — the in-app warning still shows there.
  if (Platform.OS === 'web') return;

  try {
    if (!(await ensurePermission())) return;

    await Notifications.scheduleNotificationAsync({
      content:
        status === 'over'
          ? {
              title: 'Buffer spent',
              body: `You are ${formatINR(Math.abs(remaining))} past this month's buffer.`,
            }
          : {
              title: 'Buffer running low',
              body: `${formatINR(remaining)} left in this month's buffer.`,
            },
      trigger: null, // deliver now
    });
  } catch {
    // A missed warning should never break logging a spend.
  }
}
