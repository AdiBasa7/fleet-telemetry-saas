import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ScreenCapture from 'expo-screen-capture';

// Fișiere și directoare care indică un iPhone jailbroken
const JAILBREAK_PATHS_IOS = [
  '/Applications/Cydia.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/private/var/lib/apt',
  '/private/var/tmp/cydia.log',
  '/var/lib/cydia',
];

// Fișiere care indică un telefon Android cu root
const ROOT_PATHS_ANDROID = [
  '/system/app/Superuser.apk',
  '/system/xbin/su',
  '/system/bin/su',
  '/sbin/su',
  '/su/bin/su',
  '/data/local/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/system/sd/xbin/su',
  '/system/bin/failsafe/su',
  '/data/local/tmp/su',
  '/system/xbin/busybox',
];

async function checkRootOrJailbreak() {
  try {
    const paths = Platform.OS === 'ios' ? JAILBREAK_PATHS_IOS : ROOT_PATHS_ANDROID;
    for (const p of paths) {
      const info = await FileSystem.getInfoAsync(p);
      if (info.exists) return true;
    }
  } catch {
    // FileSystem.getInfoAsync poate arunca pe unele path-uri de sistem — ignorăm
  }
  return false;
}

export function useSecurityGuard() {
  const [isCompromised, setIsCompromised] = useState(false);

  useEffect(() => {
    let active = true;

    // ── Previne screenshot-uri și screen recording ────────
    ScreenCapture.preventScreenCaptureAsync('fleet-app-guard').catch(() => {});

    // ── Detectare root / jailbreak ────────────────────────
    checkRootOrJailbreak().then((compromised) => {
      if (!active) return;
      if (compromised) {
        setIsCompromised(true);
        Alert.alert(
          'Dispozitiv nesigur',
          'Aplicația a detectat că dispozitivul tău are root/jailbreak. ' +
          'Datele flotei tale pot fi expuse altor aplicații. ' +
          'Recomandăm utilizarea unui dispozitiv oficial.',
          [{ text: 'Am înțeles', style: 'destructive' }]
        );
        if (__DEV__) console.warn('[SecurityGuard] Root/jailbreak detectat!');
      }
    });

    return () => {
      active = false;
      // Reactivăm screenshot-urile la unmount (ex: dacă ecranul devine inactiv)
      ScreenCapture.allowScreenCaptureAsync('fleet-app-guard').catch(() => {});
    };
  }, []);

  return { isCompromised };
}
