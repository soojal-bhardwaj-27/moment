package com.soojal_bhardwaj_27.locketclone

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MomentsWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "MomentsWidgetModule"
    }

    @ReactMethod
    fun updateWidget(senderName: String, timestamp: String, photoUrl: String) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("MomentsWidget", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString("senderName", senderName)
        editor.putString("timestamp", timestamp)
        editor.putString("photoUrl", photoUrl)
        editor.apply()

        // Send broadcast to update the widget
        val intent = Intent(context, MomentsWidget::class.java)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, MomentsWidget::class.java))
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}
