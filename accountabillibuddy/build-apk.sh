#!/usr/bin/env bash
# Build Accountabillibuddy APK without the Android SDK.
#
# The standard Gradle build (see settings.gradle.kts) needs the Android SDK
# from dl.google.com. When that host is unavailable, this script assembles the
# APK from artifacts on Maven Central instead:
#   - robolectric android-all  -> framework classes to compile against
#   - dalvik-dx                -> .class -> classes.dex
#   - apktool                  -> compiles manifest/resources (bundled aapt)
#   - apksig                   -> v1+v2 APK signing
#
# Usage: ./build-apk.sh <tools-dir> <out-dir>
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
TOOLS="${1:?tools dir}"; OUT="${2:?out dir}"
SRC="$HERE/app/src/main"
VERSION_NAME="$(grep -o 'versionName = "[^"]*"' "$HERE/app/build.gradle.kts" 2>/dev/null | cut -d'"' -f2 || true)"
VERSION_NAME="${VERSION_NAME:-0.1.0}"
VERSION_CODE="${VERSION_CODE:-1}"

APKTOOL_CP="$TOOLS/apktool-cli-3.0.2.jar:$TOOLS/apktool-lib-3.0.2.jar:$TOOLS/commons-cli-1.11.0.jar"
WORK="$OUT/work"; rm -rf "$WORK"; mkdir -p "$WORK/classes" "$OUT"

echo "── 1/5 javac"
find "$SRC/java" -name '*.java' > "$WORK/sources.txt"
javac --release 8 -nowarn -cp "$TOOLS/android-all.jar" \
      -d "$WORK/classes" @"$WORK/sources.txt"

echo "── 2/5 dx"
java -cp "$TOOLS/dalvik-dx-14.0.0_r21.jar" com.android.dx.command.Main \
     --dex --min-sdk-version=24 --output="$WORK/classes.dex" "$WORK/classes"

echo "── 3/5 apktool project"
PROJ="$WORK/proj"; mkdir -p "$PROJ"
cp "$WORK/classes.dex" "$PROJ/classes.dex"
cp -r "$SRC/assets" "$PROJ/assets"
cp -r "$SRC/res" "$PROJ/res"
cp "$SRC/AndroidManifest.xml" "$PROJ/AndroidManifest.xml"
cat > "$PROJ/apktool.yml" <<YML
!!brut.androlib.apk.ApkInfo
apkFileName: accountabillibuddy.apk
isFrameworkApk: false
usesFramework:
  ids:
  - 1
sdkInfo:
  minSdkVersion: 24
  targetSdkVersion: 34
versionInfo:
  versionCode: $VERSION_CODE
  versionName: $VERSION_NAME
doNotCompress:
- resources.arsc
YML

echo "── 4/5 apktool build"
java -cp "$APKTOOL_CP" brut.apktool.Main b "$PROJ" -o "$WORK/unsigned.apk" -f

echo "── 5/5 sign"
KS="$HERE/keystore/dev.jks"
if [ ! -f "$KS" ]; then
  mkdir -p "$HERE/keystore"
  keytool -genkeypair -keystore "$KS" -storepass abbdev123 -keypass abbdev123 \
    -alias abb -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Accountabillibuddy Dev" -noprompt
fi
mkdir -p "$WORK/signer"
cat > "$WORK/signer/Sign.java" <<'JAVA'
import com.android.apksig.ApkSigner;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;
import java.util.List;

public class Sign {
    public static void main(String[] args) throws Exception {
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(args[0])) {
            ks.load(in, args[1].toCharArray());
        }
        String alias = ks.aliases().nextElement();
        PrivateKey key = (PrivateKey) ks.getKey(alias, args[1].toCharArray());
        List<X509Certificate> certs =
            Collections.singletonList((X509Certificate) ks.getCertificate(alias));
        ApkSigner.SignerConfig signer =
            new ApkSigner.SignerConfig.Builder("abb", key, certs).build();
        new ApkSigner.Builder(Collections.singletonList(signer))
            .setInputApk(new File(args[2]))
            .setOutputApk(new File(args[3]))
            .setV1SigningEnabled(false)
            .setV2SigningEnabled(true)
            .build()
            .sign();
        System.out.println("signed OK");
    }
}
JAVA
javac -nowarn -cp "$TOOLS/apksig-2.3.0.jar" -d "$WORK/signer" "$WORK/signer/Sign.java"
java --add-exports java.base/sun.security.x509=ALL-UNNAMED -cp "$TOOLS/apksig-2.3.0.jar:$WORK/signer" Sign \
     "$KS" abbdev123 "$WORK/unsigned.apk" "$OUT/accountabillibuddy-v$VERSION_NAME.apk"

echo "built: $OUT/accountabillibuddy-v$VERSION_NAME.apk"
