package com.accountabillibuddy.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;

public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL = "abb_reminder";

    /* The notification names the buddy, not the task — it invokes the social
       contract ("Sunny is waiting"), never guilt. */
    private static final String[] TITLES = {
            "Sunny already stamped today 🌻",
            "Your page is waiting 📖",
            "Time to show up ✨",
            "One tiny stamp keeps the flame 🔥",
            "Sunny's rooting for you 🌻",
    };
    private static final String[] BODIES = {
            "Open your scrapbook and make today count.",
            "Ten seconds. One stamp. Done.",
            "The page looks lonely with one stamp on it.",
            "Your streak is one tap away.",
            "Meet your buddy on today's page.",
    };

    @Override
    public void onReceive(Context ctx, Intent intent) {
        NotificationManager nm =
                (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL,
                    "Daily check-in reminder", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Your daily nudge to stamp the page with your buddy");
            nm.createNotificationChannel(ch);
        }

        int day = Calendar.getInstance().get(Calendar.DAY_OF_YEAR);
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(ctx, CHANNEL)
                : new Notification.Builder(ctx);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(TITLES[day % TITLES.length])
                .setContentText(BODIES[day % BODIES.length])
                .setContentIntent(pi)
                .setAutoCancel(true);
        nm.notify(2001, b.build());
    }
}
