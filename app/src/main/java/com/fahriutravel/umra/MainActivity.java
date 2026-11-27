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
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.ValueCallback;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public final class MainActivity extends Activity {
 private static final int MICROPHONE_REQUEST = 41;
 private static final int LOCATION_REQUEST = 42;
 private static final int CAMERA_REQUEST = 43;
 private static final int PHOTO_PICKER_REQUEST = 44;
 private static final String ASSET_HOST = "appassets.androidplatform.net";
 private WebView web;
 private PermissionRequest pendingMedia;
 private boolean mediaPromptOpen;
 private ValueCallback<Uri[]> photoPicker;
 private boolean locationPromptOpen;
 private String pendingLocationOrigin;
 private GeolocationPermissions.Callback pendingLocation;

 private boolean isBundledOrigin(Uri uri) {
  return "https".equals(uri.getScheme()) && ASSET_HOST.equals(uri.getHost()) && uri.getPort() == -1;
 }
 private boolean isBundledPage(Uri uri) {
  return isBundledOrigin(uri) && uri.getPath() != null && uri.getPath().startsWith("/assets/");
 }
 private void denyPendingMedia() {
  if (pendingMedia != null) { pendingMedia.deny(); pendingMedia = null; }
 }
 private void finishMediaRequest(boolean granted) {
  PermissionRequest request = pendingMedia;
  pendingMedia = null;
  if (request == null) return;
  Uri current = web == null || web.getUrl() == null ? Uri.EMPTY : Uri.parse(web.getUrl());
  if (granted && !isFinishing() && isBundledOrigin(request.getOrigin()) && isBundledPage(current)) {
   request.grant(request.getResources());
  } else request.deny();
 }
 private boolean hasLocationPermission() {
  return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
   || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
 }
 private void finishLocationRequest(boolean granted) {
  GeolocationPermissions.Callback callback = pendingLocation;
  String origin = pendingLocationOrigin;
  pendingLocation = null;
  pendingLocationOrigin = null;
  if (callback == null || origin == null) return;
  Uri current = web == null || web.getUrl() == null ? Uri.EMPTY : Uri.parse(web.getUrl());
  callback.invoke(origin, granted && !isFinishing() && isBundledOrigin(Uri.parse(origin)) && isBundledPage(current), false);
 }
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(6,27,20));
  web = new WebView(this);
  setContentView(web);
  WebSettings settings = web.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setGeolocationEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);
  settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
   .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebChromeClient(new WebChromeClient() {
   @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
    Uri current = web == null || web.getUrl() == null ? Uri.EMPTY : Uri.parse(web.getUrl());
    if (isFinishing() || locationPromptOpen || mediaPromptOpen || !isBundledOrigin(Uri.parse(origin)) || !isBundledPage(current)) {
     callback.invoke(origin, false, false);
     return;
    }
    finishLocationRequest(false);
    pendingLocationOrigin = origin;
    pendingLocation = callback;
    if (hasLocationPermission()) finishLocationRequest(true);
    else {
     locationPromptOpen = true;
     requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_REQUEST);
    }
   }
   @Override public void onGeolocationPermissionsHidePrompt() {
    finishLocationRequest(false);
   }
   @Override public void onPermissionRequest(PermissionRequest request) {
    runOnUiThread(() -> {
     String[] resources = request.getResources();
     Uri current = web == null || web.getUrl() == null ? Uri.EMPTY : Uri.parse(web.getUrl());
     if (isFinishing() || mediaPromptOpen || locationPromptOpen || !isBundledOrigin(request.getOrigin())
         || !isBundledPage(current) || resources.length != 1) { request.deny(); return; }
     boolean audio = PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resources[0]);
     boolean video = PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resources[0]);
     if (!audio && !video) { request.deny(); return; }
     String permission = audio ? Manifest.permission.RECORD_AUDIO : Manifest.permission.CAMERA;
     denyPendingMedia();
     pendingMedia = request;
     if (checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) finishMediaRequest(true);
     else {
      mediaPromptOpen = true;
      requestPermissions(new String[]{permission}, audio ? MICROPHONE_REQUEST : CAMERA_REQUEST);
     }
    });
   }
   @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
    if (!isBundledPage(Uri.parse(view.getUrl()))) return false;
    if (photoPicker != null) return false;
    Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    picker.addCategory(Intent.CATEGORY_OPENABLE);
    picker.setType("image/*");
    photoPicker = callback;
    try { startActivityForResult(picker, PHOTO_PICKER_REQUEST); }
    catch (ActivityNotFoundException error) { photoPicker = null; callback.onReceiveValue(null); }
    return true;
   }
   @Override public void onPermissionRequestCanceled(PermissionRequest request) {
    if (pendingMedia == request) pendingMedia = null;
   }
  });
  web.setWebViewClient(new WebViewClient() {
   @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
    return assetLoader.shouldInterceptRequest(request.getUrl());
   }
   @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
    denyPendingMedia();
    finishLocationRequest(false);
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
  if (requestCode == MICROPHONE_REQUEST || requestCode == CAMERA_REQUEST) {
   mediaPromptOpen = false;
   finishMediaRequest(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
  } else if (requestCode == LOCATION_REQUEST) {
   locationPromptOpen = false;
   finishLocationRequest(hasLocationPermission());
  }
 }
 @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
  super.onActivityResult(requestCode, resultCode, data);
  if (requestCode != PHOTO_PICKER_REQUEST || photoPicker == null) return;
  ValueCallback<Uri[]> callback = photoPicker;
  photoPicker = null;
  Uri uri = resultCode == RESULT_OK && data != null ? data.getData() : null;
  callback.onReceiveValue(uri != null && "content".equals(uri.getScheme()) ? new Uri[]{uri} : null);
 }
 @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
 @Override protected void onDestroy() {
  denyPendingMedia();
  finishLocationRequest(false);
  if (photoPicker != null) { photoPicker.onReceiveValue(null); photoPicker = null; }
  if (web != null) { web.destroy(); web = null; }
  super.onDestroy();
 }
}
