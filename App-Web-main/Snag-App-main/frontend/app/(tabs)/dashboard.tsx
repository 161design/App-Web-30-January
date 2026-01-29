import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BACKEND_URL } from '../../config/api';

interface DashboardStats {
  total_snags: number;
  open_snags: number;
  in_progress_snags: number;
  resolved_snags: number;
  verified_snags: number;
  high_priority: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const canCreateSnag = user?.role === 'manager' || user?.role === 'inspector';
  const canCreateUser = user?.role === 'manager';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.name}</Text>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {canCreateSnag && (
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#366092' }]}
                onPress={() => router.push('/snag/create')}
              >
                <Ionicons name="add-circle" size={32} color="#fff" />
                <Text style={styles.actionCardText}>Create Snag</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#2ecc71' }]}
              onPress={() => router.push('/(tabs)/snags')}
            >
              <Ionicons name="list" size={32} color="#fff" />
              <Text style={styles.actionCardText}>View Snags</Text>
            </TouchableOpacity>

            {canCreateUser && (
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#e74c3c' }]}
                onPress={() => router.push('/user/create')}
              >
                <Ionicons name="person-add" size={32} color="#fff" />
                <Text style={styles.actionCardText}>Create User</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Statistics */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
                <Text style={styles.statNumber}>{stats.total_snags}</Text>
                <Text style={styles.statLabel}>Total Snags</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#e74c3c' }]}>
                <Text style={styles.statNumber}>{stats.open_snags}</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
                <Text style={styles.statNumber}>{stats.in_progress_snags}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
                <Text style={styles.statNumber}>{stats.resolved_snags}</Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#2ecc71' }]}>
                <Text style={styles.statNumber}>{stats.verified_snags}</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#e67e22' }]}>
                <Text style={styles.statNumber}>{stats.high_priority}</Text>
                <Text style={styles.statLabel}>High Priority</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  roleTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    minHeight: 100,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
  },
});
