import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BACKEND_URL } from '../../config/api';

export default function CreateUserScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('inspector');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    { value: 'manager', label: 'Manager', icon: 'briefcase' },
    { value: 'inspector', label: 'Site Inspector', icon: 'eye' },
    { value: 'contractor', label: 'Contractor', icon: 'construct' },
    { value: 'authority', label: 'Authority', icon: 'shield-checkmark' },
  ];

  const handleSubmit = async () => {
    if (!name || !email || !password || !role) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/register`, {
        name,
        email,
        password,
        role,
        phone: phone || null,
      });

      Alert.alert('Success', 'User created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating user:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = roles.find((r) => r.value === role);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create User</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Role *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowRolePicker(!showRolePicker)}
          >
            <View style={styles.pickerButtonContent}>
              <Ionicons name={selectedRole?.icon as any} size={20} color="#366092" />
              <Text style={styles.pickerButtonText}>{selectedRole?.label}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {showRolePicker && (
            <View style={styles.pickerContainer}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={styles.pickerItem}
                  onPress={() => {
                    setRole(r.value);
                    setShowRolePicker(false);
                  }}
                >
                  <Ionicons name={r.icon as any} size={20} color="#366092" />
                  <Text style={styles.pickerItemText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.roleDescriptions}>
            <Text style={styles.roleDescriptionTitle}>Role Permissions:</Text>
            <View style={styles.roleDescriptionItem}>
              <Text style={styles.roleDescriptionBullet}>•</Text>
              <Text style={styles.roleDescriptionText}>
                <Text style={styles.roleDescriptionRole}>Manager:</Text> Full access - can do
                everything
              </Text>
            </View>
            <View style={styles.roleDescriptionItem}>
              <Text style={styles.roleDescriptionBullet}>•</Text>
              <Text style={styles.roleDescriptionText}>
                <Text style={styles.roleDescriptionRole}>Site Inspector:</Text> Can create and view
                snags
              </Text>
            </View>
            <View style={styles.roleDescriptionItem}>
              <Text style={styles.roleDescriptionBullet}>•</Text>
              <Text style={styles.roleDescriptionText}>
                <Text style={styles.roleDescriptionRole}>Contractor:</Text> Can update assigned
                snags only
              </Text>
            </View>
            <View style={styles.roleDescriptionItem}>
              <Text style={styles.roleDescriptionBullet}>•</Text>
              <Text style={styles.roleDescriptionText}>
                <Text style={styles.roleDescriptionRole}>Authority:</Text> Can approve and verify
                snags
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="person-add" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Create User</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#366092',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  roleDescriptions: {
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  roleDescriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#366092',
    marginBottom: 8,
  },
  roleDescriptionItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  roleDescriptionBullet: {
    color: '#666',
    marginRight: 8,
  },
  roleDescriptionText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  roleDescriptionRole: {
    fontWeight: '600',
    color: '#366092',
  },
  submitButton: {
    backgroundColor: '#366092',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    gap: 8,
    shadowColor: '#366092',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
