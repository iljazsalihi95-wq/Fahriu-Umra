package com.fahriutravel.umra;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.graphics.Color;

public final class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state) { super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(6,27,20));
  web=new WebView(this); setContentView(web);
  WebSettings settings=web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(true); settings.setAllowContentAccess(false); settings.setAllowFileAccessFromFileURLs(false); settings.setAllowUniversalAccessFromFileURLs(false);
  web.setWebChromeClient(new WebChromeClient());
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req){
    Uri uri=req.getUrl(); String scheme=uri.getScheme();
    if (scheme!=null && scheme.equals("file") && uri.toString().startsWith("file:///android_asset/")) return false;
    if (scheme!=null && (scheme.equals("https")||scheme.equals("http"))) {startActivity(new Intent(Intent.ACTION_VIEW,uri));return true;}
    return true;
   }
  });
  web.loadUrl("file:///android_asset/index.html");
 }
 @Override public void onBackPressed(){if(web!=null && web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
