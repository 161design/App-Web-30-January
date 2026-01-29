import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { formatDate } from '../../utils/dateFormat';
import { BACKEND_URL } from '../../config/api';

interface Snag {
  id: string;
  query_no: number;
  description: string;
  location: string;
  project_name: string;
  status: string;
  priority: string;
  assigned_contractor_name?: string;
  created_at: string;
  due_date?: string;
}

interface GroupedSnags {
  projectName: string;
  snags: Snag[];
}

export default function SnagsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [snags, setSnags] = useState<Snag[]>([]);
  const [groupedSnags, setGroupedSnags] = useState<GroupedSnags[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchSnags();
  }, []);

  useEffect(() => {
    filterAndGroupSnags();
  }, [snags, searchQuery, filterStatus]);

  const fetchSnags = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/snags`);
      setSnags(response.data);
    } catch (error) {
      console.error('Error fetching snags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSnags();
    setRefreshing(false);
  };

  const filterAndGroupSnags = () => {
    let filtered = snags;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((snag) => snag.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (snag) =>
          snag.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          snag.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          snag.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          snag.query_no.toString().includes(searchQuery)
      );
    }

    // Group by project_name
    const grouped: { [key: string]: Snag[] } = {};
    filtered.forEach((snag) => {
      const projectName = snag.project_name || 'Uncategorized';
      if (!grouped[projectName]) {
        grouped[projectName] = [];
      }
      grouped[projectName].push(snag);
    });

    // Convert to array and sort by project name
    const groupedArray: GroupedSnags[] = Object.keys(grouped)
      .sort()
      .map((projectName) => ({
        projectName,
        snags: grouped[projectName].sort((a, b) => b.query_no - a.query_no),
      }));

    setGroupedSnags(groupedArray);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    Alert.alert(
      'Export Snag List',
      `Export all snags to ${format.toUpperCase()}?\n\nNote: The file will download automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => exportSnags(format),
        },
      ]
    );
  };

  const exportSnags = async (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      // Get the token
      const token = axios.defaults.headers.common['Authorization'];
      
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      // Create export URL with token in query param for browser download
      const exportUrl = `${BACKEND_URL}/snags/export/${format}`;
      
      Alert.alert(
        'Export Ready',
        `To download the ${format.toUpperCase()} file:\n\n1. The export will open in your browser\n2. File will download automatically\n3. Check your Downloads folder\n\nNote: For web browser, right-click the link and "Save As" if automatic download doesn't work.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Open Export',
            onPress: async () => {
              const supported = await Linking.canOpenURL(exportUrl);
              if (supported) {
                await Linking.openURL(exportUrl);
              } else {
                Alert.alert('Error', 'Cannot open export URL. Please copy the URL manually:\n\n' + exportUrl);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error exporting:', error);
      Alert.alert(
        'Export Error',
        `Failed to prepare export. Please try again.\n\nError: ${error.message || 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return '#e74c3c';
      case 'in_progress':
        return '#f39c12';
      case 'resolved':
        return '#9b59b6';
      case 'verified':
        return '#2ecc71';
      default:
        return '#95a5a6';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'arrow-up-circle';
      case 'medium':
        return 'remove-circle';
      case 'low':
        return 'arrow-down-circle';
      default:
        return 'remove-circle';
    }
  };

  const renderSnagItem = ({ item }: { item: Snag }) => (
    <TouchableOpacity
      style={styles.snagCard}
      onPress={() => router.push(`/snag/${item.id}`)}
    >
      <View style={styles.snagHeader}>
        <View style={styles.snagNumberContainer}>
          <Text style={styles.snagNumber}>{item.project_name} #{item.query_no}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <Text style={styles.snagDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.snagMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
        
        <View style={styles.metaItem}>
          <Ionicons name={getPriorityIcon(item.priority)} size={16} color="#666" />
          <Text style={styles.metaText}>{item.priority}</Text>
        </View>
      </View>

      {item.assigned_contractor_name && (
        <View style={styles.contractorInfo}>
          <Ionicons name="person-outline" size={14} color="#366092" />
          <Text style={styles.contractorText}>{item.assigned_contractor_name}</Text>
        </View>
      )}

      <Text style={styles.dateText}>
        Created: {formatDate(item.created_at)}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#366092" />
      </View>
    );
  }

  const canCreateSnag = user?.role === 'manager' || user?.role === 'inspector';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Snag List</Text>
        <View style={styles.headerActions}>
          {(user?.role === 'manager' || user?.role === 'authority') && (
            <>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExport('excel')}
                disabled={isExporting}
              >
                <Ionicons name="document-text" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExport('pdf')}
                disabled={isExporting}
              >
                <Ionicons name="document" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          {canCreateSnag && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/snag/create')}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by location, description, or #"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'open' && styles.filterChipActive]}
          onPress={() => setFilterStatus('open')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'open' && styles.filterChipTextActive]}>
            Open
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'in_progress' && styles.filterChipActive]}
          onPress={() => setFilterStatus('in_progress')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'in_progress' && styles.filterChipTextActive]}>
            In Progress
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'resolved' && styles.filterChipActive]}
          onPress={() => setFilterStatus('resolved')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'resolved' && styles.filterChipTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'verified' && styles.filterChipActive]}
          onPress={() => setFilterStatus('verified')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'verified' && styles.filterChipTextActive]}>
            Verified
          </Text>
        </TouchableOpacity>
      </View>

      {/* Snags List - Grouped by Building */}
      <FlatList
        data={groupedSnags}
        renderItem={({ item }) => (
          <View style={styles.projectGroup}>
            <View style={styles.projectHeader}>
              <Ionicons name="business" size={20} color="#366092" />
              <Text style={styles.projectName}>{item.projectName}</Text>
              <View style={styles.projectCount}>
                <Text style={styles.projectCountText}>{item.snags.length}</Text>
              </View>
            </View>
            {item.snags.map((snag) => renderSnagItem({ item: snag }))}
          </View>
        )}
        keyExtractor={(item) => item.projectName}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No snags found</Text>
          </View>
        }
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#366092',
    borderColor: '#366092',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  snagCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  snagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  snagNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snagNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#366092',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  snagDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  snagMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  contractorText: {
    fontSize: 13,
    color: '#366092',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  projectGroup: {
    marginBottom: 16,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#366092',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#366092',
    marginLeft: 8,
    flex: 1,
  },
  projectCount: {
    backgroundColor: '#366092',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  projectCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
