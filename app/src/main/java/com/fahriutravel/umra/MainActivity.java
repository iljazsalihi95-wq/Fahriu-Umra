package com.fahriutravel.umra;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public final class MainActivity extends Activity {
 private static final int MICROPHONE_REQUEST = 41;
 private static final String ASSET_HOST = "appassets.androidplatform.net";
 private WebView web;
 private PermissionRequest pendingMicrophone;
 private boolean microphonePromptOpen;

 private boolean isBundledOrigin(Uri uri) {
  return "https".equals(uri.getScheme()) && ASSET_HOST.equals(uri.getHost()) && uri.getPort() == -1;
 }
 private boolean isBundledPage(Uri uri) {
  return isBundledOrigin(uri) && uri.getPath() != null && uri.getPath().startsWith("/assets/");
 }
 private void denyPendingMicrophone() {
  if (pendingMicrophone != null) { pendingMicrophone.deny(); pendingMicrophone = null; }
 }
 private void finishMicrophoneRequest(boolean granted) {
  PermissionRequest request = pendingMicrophone;
  pendingMicrophone = null;
  if (request == null) return;
  Uri current = web == null || web.getUrl() == null ? Uri.EMPTY : Uri.parse(web.getUrl());
  if (granted && !isFinishing() && isBundledOrigin(request.getOrigin()) && isBundledPage(current)) {
   request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
  } else request.deny();
 }
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(6,27,20));
  web = new WebView(this);
  setContentView(web);
  WebSettings settings = web.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);
  settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
   .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebChromeClient(new WebChromeClient() {
   @Override public void onPermissionRequest(PermissionRequest request) {
    runOnUiThread(() -> {
     String[] resources = request.getResources();
     if (isFinishing() || microphonePromptOpen || !isBundledOrigin(request.getOrigin()) || resources.length != 1
       || !PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resources[0])) { request.deny(); return; }
     denyPendingMicrophone();
     pendingMicrophone = request;
     if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) finishMicrophoneRequest(true);
     else {
      microphonePromptOpen = true;
      requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_REQUEST);
     }
    });
   }
   @Override public void onPermissionRequestCanceled(PermissionRequest request) {
    if (pendingMicrophone == request) pendingMicrophone = null;
   }
  });
  web.setWebViewClient(new WebViewClient() {
   @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
    return assetLoader.shouldInterceptRequest(request.getUrl());
   }
   @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
    denyPendingMicrophone();
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    Uri uri = request.getUrl();
    if (isBundledPage(uri)) return false;
    if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
     try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (ActivityNotFoundException ignored) { }
    }
    return true;
   }
  });
  web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
 }
 @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
  super.onRequestPermissionsResult(requestCode, permissions, results);
  if (requestCode == MICROPHONE_REQUEST) {
   microphonePromptOpen = false;
   finishMicrophoneRequest(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
  }
 }
 @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
 @Override protected void onDestroy() {
  denyPendingMicrophone();
  if (web != null) { web.destroy(); web = null; }
  super.onDestroy();
 }
}
