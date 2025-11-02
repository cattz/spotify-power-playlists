# Spotify Playlist Manager - First Time Setup

Welcome! This guide will help you set up the Spotify Playlist Manager app.

## What You Need

Before using this app, you'll need to create a **Spotify Developer Application**. Don't worry - it's free, quick (5 minutes), and you only need to do it once!

**Why?** Spotify requires all apps to have API credentials for security. By creating your own app, you keep full control of your data.

---

## Quick Setup (5 Steps)

### Step 1: Create a Spotify Developer Account

1. Visit: **https://developer.spotify.com/dashboard**
2. Click **"Log in"** with your Spotify account
3. Accept the Terms of Service

✅ Done!

---

### Step 2: Create Your App

1. Click **"Create app"**
2. Fill in:
   - **Name**: `My Playlist Manager` (or anything you like)
   - **Description**: `Personal playlist tool`
   - **Redirect URI**: `http://localhost:8888/callback` ⚠️ **Copy this exactly!**
   - **API/SDKs**: Check "Web API"
3. Accept the Terms
4. Click **"Save"**

✅ App created!

---

### Step 3: Copy Your Client ID

1. On your app's page, find the **"Client ID"**
2. Click **"Copy"** or select and copy the text

Example format: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

Keep this handy for the next step!

---

### Step 4: Configure the App

Create a file named `.env` in the app folder:

**macOS/Linux:**
```bash
# In the app folder:
echo "VITE_SPOTIFY_CLIENT_ID=your_client_id_here" > .env
```

**Windows:**
1. Open Notepad
2. Type: `VITE_SPOTIFY_CLIENT_ID=your_client_id_here`
3. Replace `your_client_id_here` with your actual Client ID
4. Save As > "All Files" > name it `.env`

✅ Configuration complete!

---

### Step 5: Launch & Connect

1. Open the Spotify Playlist Manager app
2. Click **"Connect with Spotify"**
3. Your browser opens - click **"Agree"**
4. Return to the app - you're logged in!

✅ **You're all set!** 🎉

---

## Troubleshooting

### "Authentication failed"
- Check your `.env` file has the correct Client ID
- No extra spaces or quotes

### "Redirect URI mismatch"
- Go to your app on developer.spotify.com/dashboard
- Click "Edit Settings"
- Make sure Redirect URI is: `http://localhost:8888/callback`

### Can't create `.env` file on Windows?
1. Use Notepad
2. File > Save As > "All Files"
3. Name: `.env` (with the dot!)

---

## Is This Safe?

**Yes!** Your credentials stay on your computer. The app connects directly to Spotify - no third-party servers involved.

You can revoke access anytime at: **spotify.com/account/apps**

---

## Need More Help?

See the full **SETUP.md** guide or visit the project's GitHub page.

**Happy playlist managing! 🎵**
