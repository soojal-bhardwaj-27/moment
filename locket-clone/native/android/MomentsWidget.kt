package com.soojal_bhardwaj_27.locketclone

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.AsyncTask
import android.view.View
import android.widget.RemoteViews
import java.io.InputStream
import java.net.URL

class MomentsWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences("MomentsWidget", Context.MODE_PRIVATE)
            val senderName = prefs.getString("senderName", "No moments yet") ?: "No moments"
            val timestamp = prefs.getString("timestamp", "") ?: ""
            val photoUrl = prefs.getString("photoUrl", "") ?: ""

            // Resolve layout resource id dynamically
            val layoutId = context.resources.getIdentifier("widget_layout", "layout", context.packageName)
            val senderTextId = context.resources.getIdentifier("widget_sender", "id", context.packageName)
            val timeTextId = context.resources.getIdentifier("widget_time", "id", context.packageName)
            val imageId = context.resources.getIdentifier("widget_image", "id", context.packageName)

            val views = RemoteViews(context.packageName, layoutId)
            views.setTextViewText(senderTextId, senderName)
            views.setTextViewText(timeTextId, timestamp)

            if (photoUrl.isNotEmpty()) {
                DownloadImageTask(views, appWidgetId, appWidgetManager, imageId).execute(photoUrl)
            } else {
                views.setViewVisibility(imageId, View.GONE)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }

    private class DownloadImageTask(
        val views: RemoteViews,
        val appWidgetId: Int,
        val appWidgetManager: AppWidgetManager,
        val imageId: Int
    ) : AsyncTask<String, Void, Bitmap?>() {
        override fun doInBackground(vararg urls: String): Bitmap? {
            val urlDisplay = urls[0]
            var bitmap: Bitmap? = null
            try {
                val input: InputStream = URL(urlDisplay).openStream()
                bitmap = BitmapFactory.decodeStream(input)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return bitmap
        }

        override fun onPostExecute(result: Bitmap?) {
            if (result != null) {
                views.setViewVisibility(imageId, View.VISIBLE)
                views.setImageViewBitmap(imageId, result)
            }
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
