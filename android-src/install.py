"""Ajusta el proyecto Android que genera Capacitor (`npx cap add android`).

Se ejecuta en cada build: pone el número de versión, los permisos de cámara (fotos de
apuntes) y micrófono (grabar clases), y deja usar la voz del sistema (pódcast).
Se puede ejecutar varias veces.
"""
import os
import pathlib
import re
import sys

ANDROID = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'android')
manifest_path = ANDROID / 'app' / 'src' / 'main' / 'AndroidManifest.xml'
manifest = manifest_path.read_text(encoding='utf-8')

PERMISSIONS = ['android.permission.CAMERA', 'android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS']
for p in PERMISSIONS:
    if p not in manifest:
        manifest = manifest.replace('</manifest>', f'    <uses-permission android:name="{p}" />\n</manifest>')

# Android 11+ solo deja ver los motores de voz (texto a voz) si se declaran aquí.
TTS = '    <queries>\n        <intent>\n            <action android:name="android.intent.action.TTS_SERVICE" />\n        </intent>\n    </queries>\n'
if 'android.intent.action.TTS_SERVICE' not in manifest:
    manifest = manifest.replace('</manifest>', TTS + '</manifest>')
manifest_path.write_text(manifest, encoding='utf-8')

version_code = int(os.environ.get('VERSION_CODE', '1'))
gradle_path = ANDROID / 'app' / 'build.gradle'
gradle = gradle_path.read_text(encoding='utf-8')
gradle = re.sub(r'versionCode \d+', f'versionCode {version_code}', gradle, count=1)
gradle = re.sub(r'versionName "[^"]*"', f'versionName "2.{version_code}"', gradle, count=1)
gradle_path.write_text(gradle, encoding='utf-8')
print('Permisos (cámara, micrófono), voz del sistema y versión', f'2.{version_code}', f'({version_code})')
