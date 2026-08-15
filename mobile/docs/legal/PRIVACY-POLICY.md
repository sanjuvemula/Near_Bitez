# NearBitez — Privacy Policy

**Last updated:** 15 August 2026

This policy describes what the NearBitez mobile application and service collect,
why, and what happens to it. It was written against the actual data model and
the actual third-party services in use — not from a template.

Before publishing, fill in the three bracketed values at the bottom
(operator name, contact email, jurisdiction). Publish it at a public URL; the
Play Console requires one.

---

## 1. Who we are

NearBitez is a food ordering and delivery platform. The app serves three kinds
of account: **customers** who order food, **restaurant owners** who receive and
fulfil those orders, and **administrators** who operate the platform.

## 2. What we collect

### Account information
Collected when you register, and editable afterwards in Profile.

| Data | Why |
|---|---|
| Name | Identifying you to the restaurant and on the leaderboard |
| Email address | Sign-in, account recovery, order email |
| Password | Sign-in. Stored only as a bcrypt hash — we cannot read it |
| Phone number | So the restaurant can reach you about your order |
| Delivery address | Fulfilling your order |

If you sign in with Google, we receive your name and email address from Google.
We never receive your Google password.

### Order information
Items ordered, prices, the restaurant, delivery address, delivery phone,
delivery instructions, order status history, and payment status. Retained so
you can see your order history and so restaurants and support can resolve
disputes.

### Activity within the app
Loyalty points, NearCoins, level, daily streak, badges, favourite restaurants,
game scores, reward claims and referral code. Used to operate the rewards
programme and the daily leaderboard.

**Your name and score appear on a leaderboard visible to other users.** Nothing
else about you is shown there.

### Photos
Restaurant owners can upload photos of their restaurant and dishes. The app
requests access to your photo library only at the moment you choose to upload,
and only reads the image you pick. Customers are never asked for photo access.

### Messages
Messages you exchange with a restaurant, or with support, are stored so the
conversation persists and so support can help.

### Technical information
Your session token, and the network requests the app makes to our servers. Our
servers keep standard request logs.

## 3. What we do NOT collect

- **No location or GPS.** The app requests no location permission and the
  Android manifest explicitly blocks it. Delivery uses the address you type.
- **No camera or microphone access.**
- **No contacts, calendar, call log or SMS.**
- **No advertising identifier**, no ad networks, no third-party analytics or
  tracking SDK.
- **No card or bank details.** Orders are cash on delivery; we never handle
  card data.

## 4. Third parties

| Service | What it receives | Why |
|---|---|---|
| **Cloudinary** | Images uploaded by restaurant owners | Image hosting and delivery |
| **Resend** | Your email address and message content | Sending transactional email |
| **Google Sign-In** (optional) | Handled by Google; we receive name and email | Sign-in |
| **MongoDB Atlas** | All service data | Database hosting |
| **Render** | All service traffic | Application hosting |

We do not sell your personal information, and we do not share it for
advertising.

## 5. How it is protected

- Traffic between the app and our servers uses HTTPS.
- Your sign-in token is stored in the device keystore
  (Android EncryptedSharedPreferences / iOS Keychain), not in plain storage.
- Passwords are stored only as bcrypt hashes.
- Administrative actions — changing a subscription, a commission rate, a payout —
  are authorised server-side and recorded in an audit log.

No system is perfectly secure, and we cannot guarantee absolute security.

## 6. How long we keep it

- **Account data:** while your account exists.
- **Orders:** retained after delivery for your history, support and accounting.
- **Messages:** conversations expire automatically 48 hours after the last message.
- **Game scores:** daily scores are kept per day and used for that day's leaderboard.

## 7. Your rights

You can:

- **See and correct** your name, phone and address in Profile.
- **Request a copy** of your data by emailing us.
- **Request deletion** of your account and personal data by emailing us.

> **Account deletion is currently handled by email request, not in the app.**
> We aim to action requests within 30 days. Some order records may be retained
> where required for accounting or legal reasons, with your personal details
> removed.

Depending on where you live you may have further rights under local data
protection law, including objecting to processing or requesting portability.

## 8. Children

NearBitez is not directed at children under 13, and we do not knowingly collect
their data. If you believe a child has given us personal information, contact us
and we will delete it.

## 9. Changes

We will update the date at the top when this policy changes. Material changes
will be announced in the app.

## 10. Contact

- **Operator:** [LEGAL ENTITY NAME]
- **Email:** [SUPPORT EMAIL]
- **Governing law:** [JURISDICTION]
