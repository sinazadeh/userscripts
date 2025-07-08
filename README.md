# Userscripts

A curated collection of userscripts designed to enhance your browsing experience.

---

## 🛡️ Reddit Tab Icons & Title Prefix

Adds subreddit icons to Reddit tabs and prefixes the tab title with `r/SubredditName` for easier tab identification and navigation.

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Reddit_Tab_Icons_Title_Prefix.user.js).

### **✨ Features**

- Adds subreddit-specific icons to Reddit tabs for better visibility.
- Prefixes the tab title with `r/SubredditName` for quick identification.
- Handles Reddit’s single-page navigation and updates icons/titles dynamically.
- Efficient caching and minimal network requests.

---

## 😀 Emoji Font Override

Enhances emoji rendering across websites by prioritizing **Noto Color Emoji** over system default (Segoe UI Emoji). Ensures consistent and up-to-date display of modern Unicode 16 emojis.

### **🛠 Prerequisites**

To ensure proper emoji support, install the following font on your system:

- [Noto Color Emoji](https://fonts.google.com/noto/specimen/Noto+Color+Emoji)

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Emoji_Font_Override.user.js).

### **ℹ️ Notes**

- This script targets websites that specify **Segoe UI Emoji** and swaps in Noto Color Emoji, improving emoji appearance and completeness.
- It does **not** affect system-level rendering or plain `.txt` files (e.g., [emoji-test.txt](https://www.unicode.org/Public/emoji/latest/emoji-test.txt)).

### **🦊 Firefox Tip**

To extend emoji support across all websites in Firefox (and its forks), set the `font.name-list.emoji` value in `about:config` to:

```
Noto Color Emoji, Segoe UI Emoji, Twemoji Mozilla
```

### **❓ What’s new in Unicode 16?**

Check out [Emojipedia’s Unicode 16.0 overview](https://emojipedia.org/unicode-16.0) for the latest emoji additions.

---

## 🔤 Persian Font Fix (Vazir)

Improves the readability of Persian and RTL content by applying the **Vazir** font across supported websites.

### **🛠 Prerequisites**

To ensure proper rendering, install the following fonts on your system:

- [Vazirmatn](https://fonts.google.com/specimen/Vazirmatn)
- [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans)

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Persian_Font_Fix_Vazir.user.js).

---

## ↪️ Bypass Link Redirects

Automatically bypasses intermediate confirmation, warning, and interstitial pages on supported websites, taking you directly to the destination link.

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Bypass_Link_Confirmation.user.js).
