# Handheld Inventory Scanner Application

A lightweight, local-first React Native (Expo) mobile application designed specifically to scan barcodes and manage item counts offline, syncing them seamlessly with the main Web Dashboard.

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
