import React, { useState, useEffect, useRef, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QueueContext } from '../QueueContext';

export default function ScannerScreen({ onGoToExport }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);
  const [scanMode, setScanMode] = useState('standard'); // 'standard', 'coin', 'toy', 'video', or 'card'
  const [frontUri, setFrontUri] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
    
    // Alert user with double vibration for store-internal codes
    if (data && (data.startsWith('2') || data.length < 10 || data.length > 14)) {
      setTimeout(() => Vibration.vibrate(), 200);
    }
  };

  const acceptAndNext = () => {
    addItem({
      type: 'barcode',
      itemType: scanMode,
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
        
        if (scannedData) {
          addItem({
            type: 'barcode',
            itemType: scanMode,
            data: scannedData,
            uri: photo.uri,
            timestamp: Date.now(),
          });
          setScannedData(null);
          return;
        }
        
        if (scanMode === 'coin' || scanMode === 'card') {
          if (!frontUri) {
            setFrontUri(photo.uri);
          } else {
            addItem({
              type: scanMode,
              itemType: scanMode,
              frontUri: frontUri,
              backUri: photo.uri,
              timestamp: Date.now(),
            });
            setFrontUri(null); // Reset for next item
          }
        } else if (scanMode === 'toy') {
          addItem({
            type: 'toy',
            itemType: scanMode,
            uri: photo.uri,
            timestamp: Date.now(),
          });
        } else if (scanMode === 'video') {
          addItem({
            type: 'video',
            itemType: scanMode,
            uri: photo.uri,
            timestamp: Date.now(),
          });
        } else {
          // Standard photo
          addItem({
            type: 'photo',
            itemType: scanMode,
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
          barcodeTypes: ["qr", "code128", "code39", "code93", "datamatrix", "itf14", "upc_a", "upc_e", "ean13", "ean8"],
        }}
        onBarcodeScanned={(scannedData || scanMode === 'card' || scanMode === 'coin' || scanMode === 'comic') ? undefined : handleBarcodeScanned}
        ref={cameraRef}
      />
      <View style={styles.overlay}>
        {/* Mode Toggle Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.dropdownToggle}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Text style={styles.dropdownToggleText}>
              {scanMode === 'standard' ? '📷 Standard Mode' :
               scanMode === 'graded' ? '🏆 Graded Item' :
               scanMode === 'coin' ? '🪙 Coin Mode' :
               scanMode === 'card' ? '🃏 Card Mode' :
               scanMode === 'comic' ? '🦸‍♂️ Comic Book' :
               scanMode === 'toy' ? '🧸 Vintage Toy' :
               scanMode === 'game' ? '🎮 Video Game' :
               '🎬 Movies and TV Shows'} ▾
            </Text>
          </TouchableOpacity>
        </View>

        {isDropdownOpen && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('standard'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>📷 Standard Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('graded'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>🏆 Graded Item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('coin'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>🪙 Coin Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('card'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>🃏 Card Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('comic'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>🦸‍♂️ Comic Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('toy'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>🧸 Vintage Toy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('game'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>🎮 Video Game</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setScanMode('video'); setFrontUri(null); setIsDropdownOpen(false); }}>
              <Text style={styles.dropdownItemText}>🎬 Movies and TV Shows</Text>
            </TouchableOpacity>
          </View>
        )}

        {(scanMode === 'coin' || scanMode === 'card' || scanMode === 'comic' || scanMode === 'graded' || scanMode === 'video' || scanMode === 'game') && !frontUri && !scannedData && !isDropdownOpen && (
          <View style={styles.coinPrompt}>
            <Text style={styles.coinPromptText}>Capture the FRONT of the slab.</Text>
            <Text style={styles.coinPromptSub}>Ensure grading labels and barcodes are visible.</Text>
          </View>
        )}

        {(scanMode === 'coin' || scanMode === 'card' || scanMode === 'comic' || scanMode === 'graded' || scanMode === 'video' || scanMode === 'game') && frontUri && (
          <View style={styles.coinPrompt}>
            <Text style={styles.coinPromptText}>Front captured!</Text>
            <Text style={styles.coinPromptSub}>Flip {scanMode} and capture back</Text>
          </View>
        )}

        {scannedData && (() => {
          const isStore = scannedData.startsWith('2') || scannedData.length < 10 || scannedData.length > 14;
          return (
            <View style={styles.verificationOverlay}>
              <View style={[styles.scanFeedback, isStore && { backgroundColor: 'rgba(255, 149, 0, 0.95)' }]}>
                <Text style={styles.scanFeedbackText}>Scanned: {scannedData}</Text>
                {isStore && (
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginTop: 10, textAlign: 'center' }}>
                    ⚠️ Store Barcode Detected!{'\n'}Please point camera at cover and snap a photo.
                  </Text>
                )}
              </View>
              <View style={styles.verificationButtons}>
                <TouchableOpacity style={[styles.nextButton, styles.discardButton]} onPress={discardAndNext}>
                  <Text style={styles.nextButtonText}>Discard</Text>
                </TouchableOpacity>
                {isStore ? (
                  <TouchableOpacity style={[styles.nextButton, { backgroundColor: '#FF9500' }]} onPress={takePicture}>
                    <Text style={styles.nextButtonText}>📷 Snap Cover Photo</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.nextButton} onPress={acceptAndNext}>
                    <Text style={styles.nextButtonText}>Accept & Next</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })()}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={[styles.captureButtonInner, (scanMode === 'coin' || scanMode === 'card' || scanMode === 'comic' || scanMode === 'graded' || scanMode === 'video' || scanMode === 'game') && styles.captureButtonInnerCoin]} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportButton} onPress={onGoToExport}>
            <Text style={styles.exportButtonText}>Finish & Export</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.versionText}>Beta 1.3</Text>
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
    justifyContent: 'center',
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  dropdownToggle: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dropdownToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownMenu: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    marginHorizontal: 40,
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dropdownItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#fff',
  },
  coinPrompt: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    padding: 15,
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
