# Handheld Inventory Scanner Application

A lightweight, local-first React Native (Expo) mobile application designed specifically to scan barcodes and manage item counts offline, syncing them seamlessly with the main Web Dashboard.

> **Note:** Standalone Android builds will soon be officially published to the **Google Play Store**. While the code is fully compatible with iOS, there are **no active plans to publish to the Apple App Store**.

## Key Features

- **Offline-First Scan Queue**: Scan barcodes in areas with poor or zero connectivity. Items are stored locally on the device in a high-speed, persistent queue context.
- **Camera-Based Barcode Reader**: Fully integrated camera controls to scan standard UPC and EAN barcodes instantly.
- **Visual Scan Verification**: Displays scanned items with clear "Accept" and "Discard" controls, allowing operators to verify visual info and logs before adding them to the queue.
- **Direct Local Network Sync / ZIP Exports**: 
  - Generates unified JSON data structures and ZIP payloads of all scanned items.
  - Supports manual transmission transfer to the Next.js Web Dashboard.

## Project Structure

- `App.js`: Main application entry and navigator mapping.
- `QueueContext.js`: Global React state provider managing the offline scan queue and storage persistence.
- `screens/ScannerScreen.js`: Interface managing camera viewports, barcode scans, and user confirmations.
- `screens/ExportScreen.js`: Interface managing scan logs, sync settings, and data exports.

## How to Get Started (Development Setup)

### Prerequisites
Make sure you have Node.js and the Expo CLI installed. Download the **Expo Go** application on your mobile device (iOS/Android).

### Installation
1. Navigate to the mobile project folder:
   ```bash
   cd mobile
   ```
2. Install all npm dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm start
   ```

### Connecting Your Device
Scan the QR code displayed in your terminal using the **Expo Go** app (Android) or the default Camera app (iOS) to launch the scanner application instantly on your physical phone!

## Compiling a Standalone APK

If you want to compile and build a standalone, installable `.apk` file for Android devices, you can use Expo Application Services (EAS) in the cloud:

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Log in to Expo**:
   ```bash
   eas login
   ```
3. **Configure Build Settings**:
   ```bash
   eas build:configure
   ```
4. **Trigger Cloud Build**:
   Run the preview build profile (which generates an installable APK instead of a Play Store bundle):
   ```bash
   eas build --platform android --profile preview
   ```
Once the build completes on Expo's servers, you will be provided with a direct download link for the `.apk` file.

## Running on iOS (Apple Devices)

If you want to run the scanner application on an iPhone or iPad, there are two primary methods depending on your needs:

### A. Free Developer Run (Recommended)
You do **not** need a paid Apple Developer account to run the scanner for personal or development use:
1. Install the free **Expo Go** application from the App Store on your iOS device.
2. Follow the **How to Get Started** instructions above to run the development server (`npm start`) locally.
3. Open the iOS Camera app, scan the terminal QR code, and open it in Expo Go to launch the scanner instantly.

### B. Compiling a Standalone Installer Package (.ipa)
Building a standalone, shareable installer bundle (`.ipa` file) that runs natively without Expo Go requires code signing:
* **Prerequisites**: A Mac running Xcode and a paid **Apple Developer Program** subscription ($99/year).
* **Build Command**: Set up credentials and execute the EAS build command for iOS:
  ```bash
  eas build --platform ios
  ```
Because of iOS ecosystem security restrictions, Apple does not permit sideloading unsigned binary packages without certificate signing.
