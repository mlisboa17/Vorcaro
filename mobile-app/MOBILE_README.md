# Vorcaro Mobile App - MVP

React Native Expo app for personal finance management with AI companion.

## Quick Start

### Setup

```bash
# Install dependencies (already done)
npm install

# Create .env file from example
cp .env.example .env

# Update .env with your API URL
# EXPO_PUBLIC_API_URL=http://your-api-server/api
```

### Run

**Development (Expo Go)**
```bash
npm start
```

Then scan the QR code with Expo Go app on your phone.

**iOS**
```bash
npm run ios
```

**Android**
```bash
npm run android
```

**Web**
```bash
npm run web
```

## Project Structure

```
mobile-app/
├── App.tsx                 # Main entry point
├── src/
│   ├── screens/           # 5 main screens
│   │   ├── HomeScreen.tsx      (balance + transactions)
│   │   ├── LaunchScreen.tsx    (3 input modes)
│   │   ├── CompanionScreen.tsx (chat)
│   │   ├── AlertsScreen.tsx    (alerts)
│   │   └── ConfigScreen.tsx    (settings)
│   ├── navigation/        # React Navigation setup
│   │   └── RootNavigator.tsx   (bottom tabs)
│   ├── services/          # API client
│   │   └── api.ts
│   └── store/             # Zustand state management
│       └── index.ts
├── app.json              # Expo config
└── package.json
```

## Features

### MVP (Sprint 2)
- ✅ Home: Balance + recent transactions
- ✅ Launch: 3 input modes (camera, audio, text)
- ✅ Companion: Chat with AI
- ✅ Alerts: Notifications
- ✅ Config: Settings + logout
- ✅ Bottom tab navigation
- ✅ Zustand state management
- ✅ Backend API integration

### Coming Soon (Sprint 3+)
- Dark mode
- Offline support
- Advanced analytics
- Animations
- Charts & insights

## Stack

- **Framework**: React Native + Expo
- **UI**: React Native Paper (Material Design)
- **Navigation**: React Navigation
- **State**: Zustand
- **Storage**: AsyncStorage
- **Icons**: Expo Vector Icons (Material Community)

## API Integration

The app expects the following endpoints on your backend:

```
POST   /api/transactions          - Create transaction
GET    /api/transactions          - Get all transactions
GET    /api/balance               - Get account balance
POST   /api/companion/chat        - Chat with AI
GET    /api/alerts                - Get alerts
DELETE /api/alerts/:id            - Dismiss alert
POST   /api/auth/verify           - Verify token
```

All requests include `Authorization: Bearer <token>` header.

## Building for Production

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS and Android
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Local Build

```bash
# iOS (requires Mac)
eas build --platform ios --local

# Android
eas build --platform android --local
```

## Environment Variables

Create `.env` file with:

```
EXPO_PUBLIC_API_URL=https://your-api.com/api
```

## Known Limitations (MVP)

- Camera and audio modes are simulated (need ML/OCR setup)
- Offline support not included
- No dark mode
- No animations
- Basic error handling

## Next Steps

1. Connect to real backend API
2. Implement camera OCR for receipts
3. Implement audio transcription
4. Add charts and insights
5. Setup push notifications
6. Implement offline sync
7. Add dark mode
8. Performance optimization

## Support

For issues or questions about the MVP, check the main project documentation.
