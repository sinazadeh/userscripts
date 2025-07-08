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

## ↪️ Bypass Link Redirects

Automatically bypasses intermediate confirmation, warning, and interstitial pages on supported websites, taking you directly to the destination link.

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Bypass_Link_Redirects.user.js).

---

## 🖼️ Always Load HD Reddit Images

Automatically replaces blurry Reddit image previews with their full-resolution originals as you scroll. Includes a menu command to toggle the feature on or off.

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Always_Load_HD_Reddit_Images.user.js).

### **✨ Features**

- Replaces low-resolution `preview.redd.it` images with high-resolution `i.redd.it` versions.
- Works on both `<img>` tags and elements with `background-image`.
- Uses `IntersectionObserver` for efficient, on-demand loading as you scroll.
- Includes a Tampermonkey menu command to easily enable or disable the functionality.
- Dynamically handles new images loaded via infinite scroll.

---

## 🎬 Letterboxd Link Badges

Enhances Letterboxd film pages by replacing IMDb/TMDb text links with icons and adding direct "Watch on Stremio" badges.

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Letterboxd_Link_Badges.user.js).

### **✨ Features**

- Replaces the standard IMDb and TMDb text links with clean, recognizable icons.
- Adds "Open in Stremio App" and "Open in Stremio Web" buttons for one-click access.
- Dynamically injects badges on page load and handles Letterboxd's PJAX navigation.

---

## 📖 Open All Thread Pages

Adds a convenient "Open All" button to forum threads, allowing you to load every page into a new tab with a single click.

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Open_All_Thread_Pages.user.js).

### **✨ Features**

- Adds an "Open All" button next to the page navigation on forum threads.
- Opens all pages of the current thread into new tabs, from last to first.
- Includes a safety confirmation for opening a large number of tabs (over 50).

---

## 🔤 Persian Font Fix (Vazir)

Improves the readability of Persian and RTL content by applying the **Vazir** font across supported websites.

### **🛠 Prerequisites**

To ensure proper rendering, install the following fonts on your system:

- [Vazirmatn](https://fonts.google.com/specimen/Vazirmatn)
- [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans)

### **📥 Install**

To install the script, click [here](https://raw.githubusercontent.com/sinazadeh/userscripts/refs/heads/main/Persian_Font_Fix_Vazir.user.js).
