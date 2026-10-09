# Accessible Backrooms: App Store launch guide

This is the full list of steps from buying the Apple Developer account to version 1.0 on the App Store.
Each step says who does it: **You** (Leo), **Claude**, or **You + Claude**.

Two rules for the whole guide:
- Never paste a password, key file or code into the chat. When a step makes a secret, it goes straight into Codemagic or stays on your phone.
- Do the parts in order. Each part needs the one before it.

---

## Part 1: Buy the Apple Developer account (You)

Cost: 99 US dollars per year. It renews every year; if it lapses, the game is removed from the App Store until you renew.

**Before you start:**
1. Your Apple ID needs two-factor authentication turned on. Most are already. Check in Settings, your name, Sign-In and Security.
2. Apple requires the account holder to be 18 or older. If you are under 18, your dad (or another adult) enrolls with his own Apple ID, and the App Store shows his name as the seller. After that he can invite you into App Store Connect so you can do everything else yourself.

**Easiest way, on your iPhone:**
1. Install the free **Apple Developer** app from the App Store.
2. Open it, go to the **Account** tab, and sign in with your Apple ID.
3. Choose **Enroll Now**.
4. Pick **Individual** (not Organization; that needs a company number).
5. Fill in your legal name and address. Use your real legal name; it has to match your ID.
6. Pay the 99 dollars. It is charged like an in-app purchase, through your Apple ID.
7. Wait for the confirmation email: "Welcome to the Apple Developer Program". It usually takes a few hours, sometimes up to 2 days.

**Other way:** the website developer.apple.com/programs/enroll, with the same steps.

When the welcome email arrives, tell Claude: "I got the developer account".

---

## Part 2: Accept the agreement (You)

1. Go to **appstoreconnect.apple.com** in Safari and sign in.
2. If a banner says there is an agreement to review, open it and accept it.
3. The game is free, so you do **not** need the "Paid Apps" agreement, tax forms or bank details. Skip those.

---

## Part 3: Make the App ID and iCloud container (You, Claude guides you live)

This reserves the game's identity with Apple and turns on iCloud saves.
Claude walks you through each screen at the time, because Apple's pages change.

1. Go to **developer.apple.com/account**, then **Certificates, Identifiers and Profiles**.
2. Open **Identifiers**, then the **plus (+)** button.
3. **Make the iCloud container first:** choose **iCloud Containers**, Continue.
   - Description: `Accessible Backrooms saves`
   - Identifier: `iCloud.com.accessible.backrooms`
   - Continue, then Register.
4. **Make the App ID:** plus again, choose **App IDs**, then **App**.
   - Description: `Accessible Backrooms`
   - Bundle ID: **Explicit**, `com.accessible.backrooms`
   - In the capabilities list, check **iCloud**, and choose the option that includes **CloudKit**.
   - Continue, then Register.
5. Open the new App ID again, find iCloud, choose **Configure** (or Edit), check the container `iCloud.com.accessible.backrooms`, and save.

If Apple says the bundle ID `com.accessible.backrooms` is already taken, use `com.leoproductions.accessiblebackrooms` instead (and the container `iCloud.com.leoproductions.accessiblebackrooms`), and tell Claude. Claude changes it in the code. The bundle ID can never change after the game is on the store, so this is the moment to get it right.

---

## Part 4: Make the API key for Codemagic (You)

This key lets Codemagic sign the app and upload it to Apple for you. You do this once.

1. In **appstoreconnect.apple.com**, go to **Users and Access**.
2. Open the **Integrations** tab, then **App Store Connect API**.
3. If asked, request access, then choose **Generate API Key** (or the plus button).
4. Name: `Codemagic`. Access: **App Manager**.
5. Generate. You now see three things. Keep the page open:
   - **Issuer ID** (at the top of the page)
   - **Key ID** (next to the key)
   - **Download API Key**: a `.p8` file. **You can only download it once.** Save it to the Files app.
6. Do not send any of these to Claude. They go into Codemagic in the next part.

---

## Part 5: Connect Codemagic to Apple (You)

1. Go to **codemagic.io** and sign in.
2. Open **Team settings** (or your personal account settings), then **Team integrations**.
3. Find **Developer Portal** and choose **Connect** (or Manage keys, then Add key).
4. Fill in:
   - **App Store Connect API key name:** `Accessible Backrooms` (Claude needs this exact name, so tell Claude what you typed)
   - **Issuer ID** and **Key ID** from Part 4
   - **API key:** upload the `.p8` file from the Files app
5. Save.

Then tell Claude: "Codemagic is connected, the key name is ...".

---

## Part 6: Claude updates the build (Claude)

When you say Codemagic is connected, Claude does all of this in the repo:

1. Adds your iCloud plugin `capacitor-icloud-sync` 0.2.0 to the game.
2. Adds the iCloud entitlements file with the container from Part 3.
3. Switches the Codemagic workflow from "unsigned IPA" to a **signed App Store build** that uploads straight to **TestFlight**.
4. Sets the version to **1.0** and makes the build number count up by itself.
5. Turns on iCloud saves in the game: your progress, achievements and settings follow you to a new phone.
6. Keeps the old unsigned workflow too, in case you still want a sideload build.

---

## Part 7: Create the app in App Store Connect (You, Claude gives you all the text)

1. In **appstoreconnect.apple.com**, open **Apps**, then the **plus (+)** button, then **New App**.
2. Fill in:
   - **Platforms:** iOS
   - **Name:** `Accessible Backrooms` (if the name is taken, Claude suggests another, like "Accessible Backrooms: Audio Horror")
   - **Primary language:** English (U.S.)
   - **Bundle ID:** pick `com.accessible.backrooms` from the list
   - **SKU:** `accessible-backrooms-1` (only you see this)
   - **User access:** Full Access
3. Create.

---

## Part 8: First TestFlight build (You + Claude)

1. In Codemagic, start a build of the new App Store workflow.
2. It takes about 15 to 25 minutes. When it finishes, it uploads to Apple.
3. Apple then "processes" the build: another 10 to 30 minutes. You get an email when it is ready.
4. In App Store Connect, open the app, then the **TestFlight** tab.
5. Under **Internal Testing**, make a group (for example `Me`), and add yourself as a tester.
6. Install the **TestFlight** app on your iPhone. The game appears there; install it.
7. **Test these on the TestFlight build:**
   - The game starts and the voice and sounds play.
   - Voice commands work, and the microphone permission message appears.
   - Play a level, close the app completely, reopen it: Continue still works.
   - iCloud: Settings, your name, iCloud, make sure iCloud Drive is on. Play, then delete and reinstall the game: your progress comes back.

If anything is wrong, tell Claude and a new build goes up. Each new build needs a higher build number; Claude handles that.

**To let friends test** (optional): use **External Testing**. Apple does a short beta review first (usually 1 day). Then you get a public link to share.

---

## Part 9: Fill in the store page (You, Claude writes all the text)

It is all ready in **docs/appstore/store-listing.md**, with every field in order, and the screenshots are in **docs/appstore/screenshots**. The privacy policy is live at https://backrooms-audio-game.netlify.app/privacy.html

Claude prepares these in English and Portuguese, so you only copy and paste:

1. **Description**, **subtitle** (30 characters), **promotional text**, and **keywords** (100 characters).
2. **Screenshots:** Claude makes them from the game at the size Apple requires (6.9 inch iPhone).
3. **Privacy policy URL:** Claude puts a privacy policy page on the game's website. The game collects nothing, so it is short.
4. **Support URL:** the game's website, or the GitHub page.
5. **Category:** Games, then **Adventure** (second choice: Puzzle).
6. **Age rating:** answer the questionnaire. The game has horror and fear themes and no violence shown, no purchases, no chat. Claude tells you each answer. It will probably come out 12+ or 13+.
7. **App Privacy** (the "nutrition label"): choose **Data Not Collected**.
8. **Accessibility** label: Apple lets you list what the game supports. Choose **VoiceOver**, **Voice Control** if it works, **Dark Interface**, **Sufficient Contrast** and **Reduced Motion**. This matters a lot for blind players looking for games.
9. **Price:** Free. **Availability:** all countries.
10. **EU trader status:** for a free hobby app you can answer that you are **not a trader**. If you say you are, Apple shows your address and phone number publicly in the EU.
11. **App Review information:** your name, email and phone number (only Apple sees these), and a note. Claude writes the note, explaining that this is an audio game for blind players, best with headphones, and how to play with VoiceOver.
12. **Version release:** choose **Manually release this version**, so you pick the day it goes live.

---

## Part 10: Submit for review (You)

1. On the app's **1.0** page, scroll to **Build** and add the TestFlight build you tested.
2. Choose **Add for Review**, then **Submit to App Review**.
3. Review usually takes 1 to 3 days. You get emails as the status changes.
4. **If Apple rejects it:** do not worry, this is normal for a first app. Copy their message to Claude. It is usually a small fix or a note to add, then you resubmit.
5. **When it says "Pending Developer Release":** press **Release This Version**. Within a day, Accessible Backrooms 1.0 is on the App Store.

---

## Part 11: After launch (You + Claude)

1. Share the App Store link: with AppleVis (the blind gaming community), your friends, and in the game's README.
2. Updates work the same as Part 8 and Part 10: Claude makes the change, you start a Codemagic build, test on TestFlight, then submit the new version.
3. Pictures and voice lines: when you have a paid ElevenLabs plan, Claude finishes them a few at a time, and they ship in a 1.x update.
4. Renew the developer account every year.

---

## Quick checklist

- [ ] Part 1: Developer account bought and welcome email received
- [ ] Part 2: Agreement accepted
- [ ] Part 3: iCloud container and App ID made
- [ ] Part 4: API key made, `.p8` file saved
- [ ] Part 5: Codemagic connected to Apple
- [ ] Part 6: Claude updated the build
- [ ] Part 7: App created in App Store Connect
- [ ] Part 8: TestFlight build tested on your iPhone
- [ ] Part 9: Store page filled in
- [ ] Part 10: Submitted, approved, released
- [ ] Part 11: Shared with the world
