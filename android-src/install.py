"""Ajusta el proyecto Android que genera Capacitor (`npx cap add android`).

Se ejecuta en cada build: pone el número de versión y el permiso de cámara
(para hacer fotos a los apuntes). Se puede ejecutar varias veces.
"""
import os
import pathlib
import re
import sys

ANDROID = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'android')
manifest_path = ANDROID / 'app' / 'src' / 'main' / 'AndroidManifest.xml'
manifest = manifest_path.read_text(encoding='utf-8')
CAMERA = '    <uses-permission android:name="android.permission.CAMERA" />\n'
if 'android.permission.CAMERA' not in manifest:
    manifest = manifest.replace('</manifest>', CAMERA + '</manifest>')
    manifest_path.write_text(manifest, encoding='utf-8')

version_code = int(os.environ.get('VERSION_CODE', '1'))
gradle_path = ANDROID / 'app' / 'build.gradle'
gradle = gradle_path.read_text(encoding='utf-8')
gradle = re.sub(r'versionCode \d+', f'versionCode {version_code}', gradle, count=1)
gradle = re.sub(r'versionName "[^"]*"', f'versionName "0.{version_code}"', gradle, count=1)
gradle_path.write_text(gradle, encoding='utf-8')
print('Permiso de cámara y versión', f'0.{version_code}', f'({version_code})')
