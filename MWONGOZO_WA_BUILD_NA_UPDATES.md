# 📱 MWONGOZO RASMI WA KUFANYA BUILD NA SASISHO (UPDATES) ZA APK

> **MUHIMU SANA:**  
> Faili hili ni mwongozo wa msingi kwa msanidi programu yeyote (Developer au AI) anayefanya matengenezo kwenye mfumo wa **Maduka Tatu POS**.  
> Tafadhali **USIBADILISHE** wala **USIFUTE** saini ya `maduka.keystore` ili kuzuia simu za watumiaji zisigome kufanya update.

---

## 1. UTANGULIZI NA MUUNDO WA MFUMO

Mfumo huu umejengwa kwa teknolojia tatu kuu:
1. **Frontend Web:** React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + Dexie.js (IndexedDB kwa kuhifadhi data offline bila intaneti).
2. **Mobile Engine:** Capacitor 6 (Inayobadilisha web kuwa native Android app).
3. **Android Native Project:** Ipo kwenye folda la `android/`.

---

## 2. KANUNI KUU YA SAINI YA APK (`maduka.keystore`)

Ili watumiaji waweze kupokea toleo jipya (Update) bila kufuta app na bila kupoteza data zao za mauzo:
- **Kila APK lazima isainiwe kwa saini ile ile moja ya kudumu.**
- Saini hii ipo kwenye: `android/app/maduka.keystore`.
- Imeunganishwa ndani ya faili la `android/app/build.gradle` chini ya:
  ```groovy
  signingConfigs {
      debug {
          storeFile file('maduka.keystore')
          storePassword 'android'
          keyAlias 'madukapos'
          keyPassword 'android'
      }
      release {
          storeFile file('maduka.keystore')
          storePassword 'android'
          keyAlias 'madukapos'
          keyPassword 'android'
      }
  }
  ```
- ⚠️ **ONYO:** Usifute faili la `maduka.keystore`. Ukilifuta au ukibadilisha saini, simu za watumiaji zitaleta hitilafu ya:  
  `"App not installed as package conflicts with an existing package"`.

---

## 3. HATUA ZA KUFANYA UPDATE (KILA UNAPOBADILISHA KODI)

Kila unapofanya marekebisho yoyote kwenye kodi (mfano `src/`):

### Hatua ya 1: Pandisha Namba ya Toleo (Version)
Fungua faili la `android/app/build.gradle` na uongeze namba kwenye `versionCode` na `versionName`:
```groovy
defaultConfig {
    applicationId "com.madukatatu.pos"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 5        // <-- PANDISHA HII KILA MARA (+1)
    versionName "1.4"    // <-- WEKA JINA LA TOLEO JIPYA
    ...
}
```
> **Kanuni:** Android inakubali kusasisha app ikiwa tu `versionCode` mpya ni kubwa kuliko ya zamani (mfano: 1 -> 2 -> 3 -> 4 -> 5...).

---

### Hatua ya 2: Kupata APK Kupitia GitHub Actions (Njia Inayopendekezwa)
Mfumo huu una GitHub Actions Workflow iliyowekwa kwenye `.github/workflows/build-apk.yml`.  
Kila unaposukuma kodi (Push) kwenda kwenye tawi la `main`, GitHub inatengeneza APK kiotomatiki mtandaoni:

1. **Hifadhi na Sukuma Kodi:**
   ```bash
   git add .
   git commit -m "Maelezo ya mabadiliko uliyofanya"
   git push origin main
   ```

2. **Pakua APK kutoka GitHub:**
   - Fungua: [https://github.com/Nyisulya/shops/actions](https://github.com/Nyisulya/shops/actions)
   - Utakuta workflow inayoitwa **"Build Android APK"** inaendelea.
   - Subiri ipate alama ya kijani (✔️) baada ya dakika 2–3.
   - Bonyeza hiyo workflow, shuka chini sehemu ya **Artifacts**, na pakua **`MadukaPOS-APK`**.
   - Toa (unzip) faili la `app-debug.apk` lililopo ndani ya zip.

---

### Hatua ya 3: Kupata APK Kwenye Kompyuta Yako Ndani (Local Build)
Ikiwa unataka kutengeneza APK kwenye kompyuta yako bila kusubiri GitHub:
1. Hakikisha JDK 17 imewekwa.
2. Bonyeza mara mbili faili la `build-apk.bat` lililopo kwenye folda kuu la mradi, au endesha amri:
   ```cmd
   call build-apk.bat
   ```
3. Faili la `MadukaPOS.apk` litatokea moja kwa moja kwenye folda kuu la `d:\project\shops\MadukaPOS.apk`.

---

## 4. JINSI WATUMIAJI WANAVYOWEKA UPDATE KWENYE SIMU

1. Tuma faili la APK lililopakuliwa kwa mfanyakazi au mteja kupitia WhatsApp / Telegram.
2. Mpokeaji analibonyeza faili hilo moja kwa moja.
3. ⚠️ **MUHIMU:** **Asifute (asi-uninstall) app ya zamani kwanza.**
4. Simu ya Android itamwuliza:
   > **"Do you want to update this app? (Unataka kusasisha programu hii?)"**
5. Anabonyeza **Update** (Sasisha).
6. **MATOKEO:**
   - Programu inajisasisha sekunde 5 tu.
   - Data zote za zamani (mauzo, orodha ya bidhaa, stoo, historia) **zinabaki salama bila kufutika hata kidogo**!

---

## 5. MUHTASARI WA PIN NA MAJUKUMU (ACCOUNTS & ROLES)

| Jukumu / Tawi | Jina | Default PIN | Ufikiaji & Mamlaka |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Msimamizi Mkuu | `0000` | Mamlaka Yote: PIN za wote, Backup/Restore, Cloud Sync URL, Matawi, Ripoti, Stoo. |
| **Boss HQ** | Boss Central Dashboard | `9999` | Biashara Tu: Matawi yote 8, Ripoti & Faida, Stoo & Bei (Bila PIN wala Backup). |
| **Duka la Simu 1** | Duka la Soko Kuu | `1111` | Mauzo (POS), Stoo & Vifaa, Historia ya Mauzo. |
| **Duka la Simu 2** | Duka la Vunja Bei | `1112` | Mauzo (POS), Stoo & Vifaa, Historia ya Mauzo. |
| **Duka la Simu 3** | Duka la Makoroboi | `1113` | Mauzo (POS), Stoo & Vifaa, Historia ya Mauzo. |
| **GGS Laundry 1** | Machinjioni Mwanza | `2221` | Rekodi Mapato, Historia ya Nguo. |
| **GGS Laundry 2** | Mahina kati Mwanza | `2222` | Rekodi Mapato, Historia ya Nguo. |
| **GGS Laundry 3** | Nyasaka Mwanza | `2223` | Rekodi Mapato, Historia ya Nguo. |
| **GGS Laundry 4** | Sahwa Mwanza | `2224` | Rekodi Mapato, Historia ya Nguo. |
| **Wakala Kiosk** | Kinondoni Manyanya | `3333` | Kutoa/Kuweka, Usuluhishi wa Float, Miamala ya Leo. |

---

## 6. CHEKILISTI YA HARAKA (DEVELOPER CHEAT SHEET)
Kabla ya kutoa toleo jipya kwa wateja:
- [ ] Nimerekebisha kodi kwenye `src/`.
- [ ] Nimejaribu `npm run build` au `npx tsc --noEmit` na hakuna kosa lolote la TypeScript.
- [ ] Nimeongeza `versionCode` kwenye `android/app/build.gradle` (mfano kutoka 4 kwenda 5).
- [ ] Nimesukuma kwenda GitHub (`git push origin main`).
- [ ] Nimepakua APK kutoka GitHub Actions Artifacts.
- [ ] Nimeiweka kwenye simu juu ya ile ya zamani kwa kubonyeza "Update" na data zimebaki salama.
