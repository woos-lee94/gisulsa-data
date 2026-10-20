// 로컬 알림: 서버·원격 푸시 없이 이 휴대폰 안에서 요일·시각을 예약한다(설정 화면에서 켜고 끄기).
import * as Notifications from 'expo-notifications';
import { notifPlan } from './host';
import { writeNotifConfig } from './files';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function schedule(cfg) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of notifPlan(cfg)) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { hash: n.hash } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: n.weekday, hour: n.hour, minute: n.minute },
    });
  }
}

// 설정에서 바꿀 때: 켜는 알림이 있으면 그때 처음 권한을 묻는다. 거절되면 바꾸지 않는다.
export async function setNotif(cfg) {
  if (cfg.wd.on || cfg.su.on) {
    let p = await Notifications.getPermissionsAsync();
    if (!p.granted && p.canAskAgain) p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    if (!p.granted) throw new Error('denied');
  }
  await schedule(cfg);
  writeNotifConfig(cfg);
  return cfg;
}

// 알림을 눌러 앱을 열었을 때 갈 화면(#today·#review)
export function hashOf(response) {
  const h = response && response.notification.request.content.data && response.notification.request.content.data.hash;
  return h === 'today' || h === 'review' ? h : null;
}

export const { addNotificationResponseReceivedListener, getLastNotificationResponse, clearLastNotificationResponse } = Notifications;
