package com.accountabillibuddy.app;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView web;
    private PermissionRequest pendingCameraRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#FBF3DC"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                /* Only the camera, only for our own page. Live capture is the
                   anti-cheat: there is no gallery path into the scrapbook. */
                boolean wantsVideo = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsVideo = true;
                }
                if (!wantsVideo) { request.deny(); return; }
                if (Build.VERSION.SDK_INT < 23 ||
                        checkSelfPermission(android.Manifest.permission.CAMERA)
                                == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                } else {
                    pendingCameraRequest = request;
                    requestPermissions(new String[]{android.Manifest.permission.CAMERA}, 2);
                }
            }
        });
        web.addJavascriptInterface(new Bridge(), "ABBNative");
        web.loadUrl("file:///android_asset/www/index.html");
        setContentView(web);

        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                        != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1);
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code == 2 && pendingCameraRequest != null) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                pendingCameraRequest.grant(
                        new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else {
                pendingCameraRequest.deny();
            }
            pendingCameraRequest = null;
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void setReminder(int hour, int minute) {
            ReminderScheduler.schedule(MainActivity.this, hour, minute);
        }

        @JavascriptInterface
        public void clearReminder() {
            ReminderScheduler.cancel(MainActivity.this);
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
