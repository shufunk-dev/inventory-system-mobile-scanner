import React, { useContext, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { QueueContext } from '../QueueContext';

export default function ExportScreen({ onGoToScanner }) {
  const { queue, clearQueue } = useContext(QueueContext);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (queue.length === 0) {
      Alert.alert('Empty Queue', 'There are no items to export.');
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const metadata = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.type === 'barcode') {
          if (item.uri) {
            const base64Data = await FileSystem.readAsStringAsync(item.uri, {
              encoding: 'base64',
            });
            const filename = `photo_${item.timestamp}.jpg`;
            zip.file(filename, base64Data, { base64: true });
            metadata.push({
              type: 'barcode',
              itemType: item.itemType,
              data: item.data,
              filename: filename,
              timestamp: item.timestamp,
            });
          } else {
            metadata.push({
              type: 'barcode',
              itemType: item.itemType,
              data: item.data,
              timestamp: item.timestamp,
            });
          }
        } else if (item.type === 'photo') {
          const base64Data = await FileSystem.readAsStringAsync(item.uri, {
            encoding: 'base64',
          });
          const filename = `photo_${item.timestamp}.jpg`;
          zip.file(filename, base64Data, { base64: true });
          metadata.push({
            type: 'photo',
            itemType: item.itemType,
            filename: filename,
            timestamp: item.timestamp,
          });
        } else if (item.type === 'toy') {
          const base64Data = await FileSystem.readAsStringAsync(item.uri, {
            encoding: 'base64',
          });
          const filename = `toy_${item.timestamp}.jpg`;
          zip.file(filename, base64Data, { base64: true });
          metadata.push({
            type: 'toy',
            itemType: item.itemType,
            filename: filename,
            timestamp: item.timestamp,
          });
        } else if (item.type === 'video') {
          const base64Data = await FileSystem.readAsStringAsync(item.uri, {
            encoding: 'base64',
          });
          const filename = `video_${item.timestamp}.jpg`;
          zip.file(filename, base64Data, { base64: true });
          metadata.push({
            type: 'video',
            itemType: item.itemType,
            filename: filename,
            timestamp: item.timestamp,
          });
        } else if (item.type === 'coin' || item.type === 'card') {
          // Read Front
          const frontBase64 = await FileSystem.readAsStringAsync(item.frontUri, { encoding: 'base64' });
          const frontFilename = `${item.type}_front_${item.timestamp}.jpg`;
          zip.file(frontFilename, frontBase64, { base64: true });

          // Read Back
          const backBase64 = await FileSystem.readAsStringAsync(item.backUri, { encoding: 'base64' });
          const backFilename = `${item.type}_back_${item.timestamp}.jpg`;
          zip.file(backFilename, backBase64, { base64: true });

          metadata.push({
            type: item.type,
            itemType: item.itemType,
            frontFilename,
            backFilename,
            timestamp: item.timestamp,
          });
        }
      }

      zip.file('data.json', JSON.stringify(metadata, null, 2));

      const zipBase64 = await zip.generateAsync({ type: 'base64' });
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const zipUri = FileSystem.cacheDirectory + `inventory_export_${timestampStr}.zip`;
      
      await FileSystem.writeAsStringAsync(zipUri, zipBase64, {
        encoding: 'base64',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(zipUri);
        clearQueue();
        onGoToScanner();
      } else {
        Alert.alert('Sharing Unavailable', 'Cannot share files on this device.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failed', 'An error occurred while creating the export file.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderItem = ({ item }) => {
    let typeLabel = 'Photo';
    let dataLabel = 'Image Captured';

    if (item.type === 'barcode') {
      typeLabel = 'Barcode';
      dataLabel = item.data;
    } else if (item.type === 'coin' || item.type === 'card') {
      typeLabel = item.type === 'coin' ? 'Coin' : 'Trading Card';
      dataLabel = 'Front & Back Captured';
    } else if (item.type === 'toy') {
      typeLabel = 'Toy';
      dataLabel = 'Action Figure / Toy Captured';
    } else if (item.type === 'video') {
      typeLabel = 'Video';
      dataLabel = 'Video Captured';
    }

    return (
      <View style={styles.itemRow}>
        <Text style={styles.itemType}>{typeLabel}</Text>
        <Text style={styles.itemData} numberOfLines={1}>{dataLabel}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Scanned Items ({queue.length})</Text>
      
      <FlatList
        data={queue}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items scanned yet.</Text>
        }
      />

      <View style={styles.controls}>
        <TouchableOpacity style={styles.backButton} onPress={onGoToScanner}>
          <Text style={styles.backButtonText}>Back to Scanner</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.exportButton, queue.length === 0 && styles.disabledButton]} 
          onPress={handleExport}
          disabled={queue.length === 0 || isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.exportButtonText}>Export ZIP</Text>
          )}
        </TouchableOpacity>
      </View>

      {queue.length > 0 && (
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={() => {
            Alert.alert(
              'Clear Queue',
              'Are you sure you want to clear all scanned items? This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => { clearQueue(); onGoToScanner(); } }
              ]
            );
          }}
        >
          <Text style={styles.clearButtonText}>Clear Queue & Restart</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemType: {
    fontWeight: 'bold',
    color: '#555',
    width: 80,
  },
  itemData: {
    flex: 1,
    color: '#888',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
  },
  controls: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  exportButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  clearButton: {
    paddingVertical: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  clearButtonText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
});
