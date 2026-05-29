import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { QueueProvider } from './QueueContext';
import ScannerScreen from './screens/ScannerScreen';
import ExportScreen from './screens/ExportScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Scanner');

  return (
    <QueueProvider>
      <View style={styles.container}>
        {currentScreen === 'Scanner' ? (
          <ScannerScreen onGoToExport={() => setCurrentScreen('Export')} />
        ) : (
          <ExportScreen onGoToScanner={() => setCurrentScreen('Scanner')} />
        )}
      </View>
    </QueueProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
