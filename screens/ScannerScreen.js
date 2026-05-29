import React, { useState, useEffect, useRef, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QueueContext } from '../QueueContext';

export default function ScannerScreen({ onGoToExport }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);
  const [scanMode, setScanMode] = useState('standard'); // 'standard', 'coin', or 'toy'
  const [coinFrontUri, setCoinFrontUri] = useState(null);
  const { addItem } = useContext(QueueContext);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }) => {
    if (scannedData) return;
    setScannedData(data);
    Vibration.vibrate();
  };

  const acceptAndNext = () => {
    addItem({
      type: 'barcode',
      data: scannedData,
      timestamp: Date.now(),
    });
    setScannedData(null);
  };

  const discardAndNext = () => {
    setScannedData(null);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        // We compress the image heavily to prevent the ZIP export from exploding in size
        // quality: 0.6 drops a 4MB photo to ~400KB while keeping text perfectly readable for OCR.
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
        Vibration.vibrate();
        
        if (scanMode === 'coin') {
          if (!coinFrontUri) {
            setCoinFrontUri(photo.uri);
          } else {
            addItem({
              type: 'coin',
              frontUri: coinFrontUri,
              backUri: photo.uri,
              timestamp: Date.now(),
            });
            setCoinFrontUri(null); // Reset for next coin
          }
        } else if (scanMode === 'toy') {
          // Toy photo
          addItem({
            type: 'toy',
            uri: photo.uri,
            timestamp: Date.now(),
          });
        } else {
          // Standard photo
          addItem({
            type: 'photo',
            uri: photo.uri,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Failed to take picture:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "upc_a", "upc_e", "ean13", "ean8"],
        }}
        onBarcodeScanned={scannedData ? undefined : handleBarcodeScanned}
        ref={cameraRef}
      />
      <View style={styles.overlay}>
        {/* Mode Toggle Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.modeButton, scanMode === 'standard' && styles.modeButtonActive]}
            onPress={() => { setScanMode('standard'); setCoinFrontUri(null); }}
          >
            <Text style={[styles.modeText, scanMode === 'standard' && styles.modeTextActive]}>📷 Std</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modeButton, scanMode === 'coin' && styles.modeButtonActive]}
            onPress={() => setScanMode('coin')}
          >
            <Text style={[styles.modeText, scanMode === 'coin' && styles.modeTextActive]}>🪙 Coin</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.modeButton, scanMode === 'toy' && styles.modeButtonActive]}
            onPress={() => { setScanMode('toy'); setCoinFrontUri(null); }}
          >
            <Text style={[styles.modeText, scanMode === 'toy' && styles.modeTextActive]}>🧸 Toy</Text>
          </TouchableOpacity>
        </View>

        {scanMode === 'coin' && coinFrontUri && (
          <View style={styles.coinPrompt}>
            <Text style={styles.coinPromptText}>Front captured!</Text>
            <Text style={styles.coinPromptSub}>Flip coin and capture back</Text>
          </View>
        )}

        {scannedData && (
          <View style={styles.verificationOverlay}>
            <View style={styles.scanFeedback}>
              <Text style={styles.scanFeedbackText}>Scanned: {scannedData}</Text>
            </View>
            <View style={styles.verificationButtons}>
              <TouchableOpacity style={[styles.nextButton, styles.discardButton]} onPress={discardAndNext}>
                <Text style={styles.nextButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextButton} onPress={acceptAndNext}>
                <Text style={styles.nextButtonText}>Accept & Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={[styles.captureButtonInner, scanMode === 'coin' && styles.captureButtonInnerCoin]} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportButton} onPress={onGoToExport}>
            <Text style={styles.exportButtonText}>Finish & Export</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.versionText}>Beta 1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  verificationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scanFeedback: {
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  scanFeedbackText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
  },
  verificationButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  discardButton: {
    backgroundColor: '#FF3B30',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
    paddingBottom: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginHorizontal: 50,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  versionText: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 10,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  modeText: {
    color: '#888',
    fontWeight: 'bold',
  },
  modeTextActive: {
    color: '#fff',
  },
  coinPrompt: {
    position: 'absolute',
    top: '45%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  coinPromptText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  coinPromptSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 5,
  },
  captureButtonInnerCoin: {
    backgroundColor: '#FF9500',
  }
});
