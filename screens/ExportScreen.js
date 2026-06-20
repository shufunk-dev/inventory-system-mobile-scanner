import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { QueueContext } from '../QueueContext';

const SETTINGS_FILE_PATH = FileSystem.documentDirectory + 'sync_settings.json';

export default function ExportScreen({ onGoToScanner }) {
  const { queue, clearQueue } = useContext(QueueContext);
  const [isExporting, setIsExporting] = useState(false);

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE_PATH);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(SETTINGS_FILE_PATH);
        const data = JSON.parse(content);
        if (data.serverUrl) setServerUrl(data.serverUrl);
        if (data.email) setEmail(data.email);
        if (data.password) setPassword(data.password);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  };

  const saveSettings = async (url, mail, pwd) => {
    try {
      const data = { serverUrl: url, email: mail, password: pwd };
      await FileSystem.writeAsStringAsync(SETTINGS_FILE_PATH, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  };

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

  const handleDirectSync = async () => {
    if (!serverUrl || !email || !password) {
      Alert.alert('Configuration Missing', 'Please configure your Server Connection Settings first by tapping the gear icon ⚙️.');
      return;
    }

    if (queue.length === 0) {
      Alert.alert('Empty Queue', 'There are no items to sync.');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Authenticate with server to fetch bearer token
      const loginRes = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.error || 'Authentication failed. Please check your credentials.');
      }
      
      const token = loginData.token;
      if (!token) {
        throw new Error('Server did not return a session token.');
      }

      // 2. Package current queue into ZIP
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

      // 3. Upload ZIP via fetch
      const formData = new FormData();
      formData.append('file', {
        uri: zipUri,
        name: `inventory_export_${timestampStr}.zip`,
        type: 'application/zip',
      });

      const uploadRes = await fetch(`${serverUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload package to server.');
      }

      Alert.alert(
        'Sync Successful',
        `Successfully synced ${uploadData.count || queue.length} items directly to the server!`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearQueue();
              onGoToScanner();
            }
          }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Sync Failed', err.message || 'An error occurred during syncing.');
    } finally {
      setIsSyncing(false);
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
      <View style={styles.headerRow}>
        <Text style={styles.header}>Scanned Items ({queue.length})</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsModalVisible(true)}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
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
        <TouchableOpacity 
          style={[styles.syncButton, (queue.length === 0 || isSyncing || isExporting) && styles.disabledButton]} 
          onPress={handleDirectSync}
          disabled={queue.length === 0 || isSyncing || isExporting}
        >
          {isSyncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>⚡ Sync to Server</Text>
          )}
        </TouchableOpacity>

        <View style={styles.rowControls}>
          <TouchableOpacity style={styles.backButton} onPress={onGoToScanner} disabled={isSyncing || isExporting}>
            <Text style={styles.backButtonText}>Back to Scanner</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.exportButton, (queue.length === 0 || isExporting || isSyncing) && styles.disabledButton]} 
            onPress={handleExport}
            disabled={queue.length === 0 || isExporting || isSyncing}
          >
            {isExporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.exportButtonText}>Export ZIP</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {queue.length > 0 && (
        <TouchableOpacity 
          style={styles.clearButton} 
          disabled={isSyncing || isExporting}
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Server Connection Settings</Text>
            
            <Text style={styles.inputLabel}>Server URL</Text>
            <TextInput
              style={styles.textInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="e.g. http://192.168.1.150:3000"
              autoCapitalize="none"
              keyboardType="url"
            />
            
            <Text style={styles.inputLabel}>Account Email</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@store.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  loadSettings(); // revert changes
                  setSettingsModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSaveButton} 
                onPress={async () => {
                  let cleanUrl = serverUrl.trim();
                  if (cleanUrl.endsWith('/')) {
                    cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
                  }
                  setServerUrl(cleanUrl);
                  await saveSettings(cleanUrl, email.trim(), password);
                  setSettingsModalVisible(false);
                  Alert.alert('Settings Saved', 'Connection settings have been successfully updated.');
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    padding: 5,
  },
  settingsIcon: {
    fontSize: 24,
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
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  syncButton: {
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rowControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
