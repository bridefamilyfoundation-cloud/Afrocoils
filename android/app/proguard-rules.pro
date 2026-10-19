# Capacitor bridges JavaScript to native through reflection and
# @JavascriptInterface annotations. R8 cannot see those call sites, so without
# these keeps a release build strips the plugin classes and every native call
# fails at runtime — a failure that does NOT reproduce in debug builds, because
# debug does not run R8.

-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Methods exposed to the WebView.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Installed Capacitor plugins (status bar, keyboard, splash screen).
-keep class com.capacitorjs.plugins.** { *; }

# Cordova plugin shim that Capacitor loads reflectively.
-keep class org.apache.cordova.** { *; }

# The bridge reads annotations and generic signatures to route calls.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Keep line numbers so release crash reports stay readable, but hide the
# original source file names.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Strip verbose/debug logging from release builds.
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}
