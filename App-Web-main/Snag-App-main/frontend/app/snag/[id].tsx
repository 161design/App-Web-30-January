import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { formatDate, formatDateTime } from '../../utils/dateFormat';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { BACKEND_URL } from '../../config/api';

interface Snag {
  id: string;
  query_no: number;
  project_name: string;
  description: string;
  location: string;
  photos: string[];
  status: string;
  priority: string;
  possible_solution?: string;
  utm_coordinates?: string;
  cost_estimate?: number;
  assigned_contractor_id?: string;
  assigned_contractor_name?: string;
  assigned_authority_id?: string;
  assigned_authority_name?: string;
  assigned_authority_ids?: string[];
  assigned_authority_names?: string[];
  due_date?: string;
  authority_feedback?: string;
  authority_comment?: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  work_started_date?: string;
  work_completed_date?: string;
  contractor_completion_date?: string;
  contractor_completed?: boolean;
  authority_approved?: boolean;
}

interface Contractor {
  id: string;
  name: string;
  email: string;
}

interface Authority {
  id: string;
  name: string;
}

export default function SnagDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [snag, setSnag] = useState<Snag | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [feedback, setFeedback] = useState('');
  const [authorityComment, setAuthorityComment] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedSnag, setEditedSnag] = useState<Partial<Snag>>({});
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [selectedAuthorityIds, setSelectedAuthorityIds] = useState<string[]>([]);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showAuthorityModal, setShowAuthorityModal] = useState(false);
  const [showCompletionDatePicker, setShowCompletionDatePicker] = useState(false);
  const [contractorCompletionDate, setContractorCompletionDate] = useState<Date | null>(null);

  // Permission checks
  const canEdit = user?.role === 'manager' || user?.role === 'inspector';
  const isContractor = user?.role === 'contractor';
  const isAuthority = user?.role === 'authority';

  useEffect(() => {
    fetchSnag();
    fetchContractors();
    fetchAuthorities();
  }, []);

  const fetchContractors = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users/contractors`);
      setContractors(response.data);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    }
  };

  const fetchAuthorities = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users/authorities`);
      setAuthorities(response.data);
    } catch (error) {
      console.error('Error fetching authorities:', error);
    }
  };

  const fetchSnag = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/snags/${id}`);
      setSnag(response.data);
      setFeedback(response.data.authority_feedback || '');
      setAuthorityComment(response.data.authority_comment || '');
      // Set selected authorities from snag data
      setSelectedAuthorityIds(response.data.assigned_authority_ids || 
        (response.data.assigned_authority_id ? [response.data.assigned_authority_id] : []));
      if (response.data.contractor_completion_date) {
        setContractorCompletionDate(new Date(response.data.contractor_completion_date));
      }
    } catch (error) {
      console.error('Error fetching snag:', error);
      Alert.alert('Error', 'Failed to load snag details');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthority = (authorityId: string) => {
    setSelectedAuthorityIds(prev => 
      prev.includes(authorityId) 
        ? prev.filter(id => id !== authorityId)
        : [...prev, authorityId]
    );
  };

  const startEditing = () => {
    if (!snag) return;
    setEditedSnag({
      description: snag.description,
      location: snag.location,
      project_name: snag.project_name,
      possible_solution: snag.possible_solution || '',
      priority: snag.priority,
      cost_estimate: snag.cost_estimate,
      assigned_contractor_id: snag.assigned_contractor_id,
      due_date: snag.due_date,
      photos: [...snag.photos],
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedSnag({});
    setIsEditing(false);
  };

  const saveChanges = async () => {
    if (!snag || !editedSnag) return;
    
    setIsSaving(true);
    try {
      const updateData: any = {};
      
      // Only include changed fields
      if (editedSnag.description !== snag.description) {
        updateData.description = editedSnag.description;
      }
      if (editedSnag.location !== snag.location) {
        updateData.location = editedSnag.location;
      }
      if (editedSnag.project_name !== snag.project_name) {
        updateData.project_name = editedSnag.project_name;
      }
      if (editedSnag.possible_solution !== (snag.possible_solution || '')) {
        updateData.possible_solution = editedSnag.possible_solution;
      }
      if (editedSnag.priority !== snag.priority) {
        updateData.priority = editedSnag.priority;
      }
      if (editedSnag.cost_estimate !== snag.cost_estimate) {
        updateData.cost_estimate = editedSnag.cost_estimate;
      }
      if (editedSnag.assigned_contractor_id !== snag.assigned_contractor_id) {
        updateData.assigned_contractor_id = editedSnag.assigned_contractor_id;
      }
      if (editedSnag.due_date !== snag.due_date) {
        updateData.due_date = editedSnag.due_date;
      }
      if (JSON.stringify(editedSnag.photos) !== JSON.stringify(snag.photos)) {
        updateData.photos = editedSnag.photos;
      }
      // Add multiple authorities
      const originalAuthIds = snag.assigned_authority_ids || (snag.assigned_authority_id ? [snag.assigned_authority_id] : []);
      if (JSON.stringify(selectedAuthorityIds.sort()) !== JSON.stringify(originalAuthIds.sort())) {
        updateData.assigned_authority_ids = selectedAuthorityIds;
      }

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Info', 'No changes to save');
        setIsEditing(false);
        return;
      }

      await axios.put(`${BACKEND_URL}/api/snags/${id}`, updateData);
      Alert.alert('Success', 'Snag updated successfully');
      setIsEditing(false);
      setEditedSnag({});
      fetchSnag();
    } catch (error: any) {
      console.error('Error updating snag:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update snag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateConfirm = (date: Date) => {
    setEditedSnag({ ...editedSnag, due_date: date.toISOString() });
    setDatePickerVisibility(false);
  };

  const addPhoto = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is needed');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Gallery permission is needed');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setEditedSnag({
          ...editedSnag,
          photos: [...(editedSnag.photos || []), newPhoto],
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = [...(editedSnag.photos || [])];
    updatedPhotos.splice(index, 1);
    setEditedSnag({ ...editedSnag, photos: updatedPhotos });
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'in_progress' && !snag?.work_started_date) {
        updateData.work_started_date = new Date().toISOString();
      }
      
      if (newStatus === 'resolved' && !snag?.work_completed_date) {
        updateData.work_completed_date = new Date().toISOString();
      }

      await axios.put(`${BACKEND_URL}/api/snags/${id}`, updateData);
      Alert.alert('Success', 'Status updated successfully');
      fetchSnag();
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter feedback');
      return;
    }

    try {
      await axios.put(`${BACKEND_URL}/api/snags/${id}`, {
        authority_feedback: feedback,
        authority_comment: authorityComment,
        authority_approved: true,
        status: 'verified',
      });
      Alert.alert('Success', 'Feedback submitted and snag verified');
      setShowFeedbackModal(false);
      fetchSnag();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit feedback');
    }
  };

  const submitContractorCompletion = async () => {
    try {
      const updateData: any = {
        contractor_completed: true,
        work_completed_date: new Date().toISOString(),
      };
      
      if (contractorCompletionDate) {
        updateData.contractor_completion_date = contractorCompletionDate.toISOString();
      }

      await axios.put(`${BACKEND_URL}/api/snags/${id}`, updateData);
      Alert.alert('Success', 'Work marked as completed');
      fetchSnag();
    } catch (error: any) {
      console.error('Error marking completion:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to mark completion');
    }
  };

  const handleCompletionDateConfirm = (date: Date) => {
    setContractorCompletionDate(date);
    setShowCompletionDatePicker(false);
  };

  const deleteSnag = () => {
    Alert.alert('Delete Snag', 'Are you sure you want to delete this snag?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${BACKEND_URL}/api/snags/${id}`);
            Alert.alert('Success', 'Snag deleted successfully', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete snag');
          }
        },
      },
    ]);
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

  const canUpdateStatus = () => {
    if (user?.role === 'manager') return true;
    if (user?.role === 'contractor' && snag?.assigned_contractor_id === user?.id) return true;
    if (user?.role === 'authority') return true;
    return false;
  };

  const canDelete = user?.role === 'manager';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#366092" />
      </View>
    );
  }

  if (!snag) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Snag not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {snag.project_name} #{snag.query_no}
        </Text>
        <View style={styles.headerActions}>
          {canEdit && !isEditing && (
            <TouchableOpacity onPress={startEditing} style={styles.headerButton}>
              <Ionicons name="create-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {canDelete && !isEditing && (
            <TouchableOpacity onPress={deleteSnag} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Edit Mode Header Bar */}
      {isEditing && (
        <View style={styles.editModeBar}>
          <TouchableOpacity onPress={cancelEditing} style={styles.editModeButton}>
            <Ionicons name="close" size={20} color="#e74c3c" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editModeTitle}>Edit Mode</Text>
          <TouchableOpacity 
            onPress={saveChanges} 
            style={[styles.editModeButton, styles.saveButton]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(snag.status) }]}>
          <Text style={styles.statusText}>{snag.status.replace('_', ' ').toUpperCase()}</Text>
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          {isEditing ? (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photosContainer}>
                  {(editedSnag.photos || []).map((photo, index) => (
                    <View key={index} style={styles.editPhotoWrapper}>
                      <Image source={{ uri: photo }} style={styles.photo} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={28} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={() => {
                      Alert.alert('Add Photo', 'Choose source', [
                        { text: 'Camera', onPress: () => addPhoto('camera') },
                        { text: 'Gallery', onPress: () => addPhoto('gallery') },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }}
                  >
                    <Ionicons name="add" size={40} color="#366092" />
                    <Text style={styles.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          ) : snag.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosContainer}>
                {snag.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedPhotoIndex(index)}
                  >
                    <Image source={{ uri: photo }} style={styles.photo} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.noPhotosText}>No photos attached</Text>
          )}
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editedSnag.description}
              onChangeText={(text) => setEditedSnag({ ...editedSnag, description: text })}
              multiline
              numberOfLines={4}
              placeholder="Enter description..."
            />
          ) : (
            <Text style={styles.description}>{snag.description}</Text>
          )}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          {/* Location */}
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInputSmall}
                  value={editedSnag.location}
                  onChangeText={(text) => setEditedSnag({ ...editedSnag, location: text })}
                  placeholder="Enter location..."
                />
              ) : (
                <Text style={styles.detailValue}>{snag.location}</Text>
              )}
            </View>
          </View>

          {/* Project Name */}
          <View style={styles.detailRow}>
            <Ionicons name="business" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Project/Building</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInputSmall}
                  value={editedSnag.project_name}
                  onChangeText={(text) => setEditedSnag({ ...editedSnag, project_name: text })}
                  placeholder="Enter project name..."
                />
              ) : (
                <Text style={styles.detailValue}>{snag.project_name}</Text>
              )}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.detailRow}>
            <Ionicons name="flag" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Priority</Text>
              {isEditing ? (
                <View style={styles.prioritySelector}>
                  {['high', 'medium', 'low'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOption,
                        editedSnag.priority === p && styles.priorityOptionSelected,
                        p === 'high' && styles.priorityHigh,
                        p === 'medium' && styles.priorityMedium,
                        p === 'low' && styles.priorityLow,
                      ]}
                      onPress={() => setEditedSnag({ ...editedSnag, priority: p })}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          editedSnag.priority === p && styles.priorityTextSelected,
                        ]}
                      >
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>
                  {snag.priority}
                </Text>
              )}
            </View>
          </View>

          {/* Possible Solution */}
          <View style={styles.detailRow}>
            <Ionicons name="bulb" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Possible Solution</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInputSmall}
                  value={editedSnag.possible_solution}
                  onChangeText={(text) => setEditedSnag({ ...editedSnag, possible_solution: text })}
                  placeholder="Enter possible solution..."
                  multiline
                />
              ) : (
                <Text style={styles.detailValue}>
                  {snag.possible_solution || 'Not specified'}
                </Text>
              )}
            </View>
          </View>

          {/* Cost Estimate */}
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Cost Estimate</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInputSmall}
                  value={editedSnag.cost_estimate?.toString() || ''}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    setEditedSnag({ ...editedSnag, cost_estimate: isNaN(num) ? undefined : num });
                  }}
                  placeholder="Enter cost..."
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.detailValue}>
                  {snag.cost_estimate ? `$${snag.cost_estimate}` : 'Not specified'}
                </Text>
              )}
            </View>
          </View>

          {/* Assigned Contractor */}
          <View style={styles.detailRow}>
            <Ionicons name="person" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Assigned Contractor</Text>
              {isEditing ? (
                <TouchableOpacity
                  style={styles.contractorSelector}
                  onPress={() => setShowContractorModal(true)}
                >
                  <Text style={styles.contractorSelectorText}>
                    {contractors.find((c) => c.id === editedSnag.assigned_contractor_id)?.name ||
                      'Select Contractor'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              ) : (
                <Text style={styles.detailValue}>
                  {snag.assigned_contractor_name || 'Not assigned'}
                </Text>
              )}
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Due Date</Text>
              {isEditing ? (
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={() => setDatePickerVisibility(true)}
                >
                  <Text style={styles.dateSelectorText}>
                    {editedSnag.due_date ? formatDate(editedSnag.due_date) : 'Select Date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>
              ) : (
                <Text style={styles.detailValue}>
                  {snag.due_date ? formatDate(snag.due_date) : 'Not set'}
                </Text>
              )}
            </View>
          </View>

          {/* UTM Coordinates (read-only) */}
          {snag.utm_coordinates && (
            <View style={styles.detailRow}>
              <Ionicons name="navigate" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>GPS (UTM)</Text>
                <Text style={styles.detailValue}>{snag.utm_coordinates}</Text>
              </View>
            </View>
          )}

          {/* Created By (read-only) */}
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Created By</Text>
              <Text style={styles.detailValue}>{snag.created_by_name}</Text>
            </View>
          </View>

          {/* Created At (read-only) */}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Created At</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(snag.created_at)}
              </Text>
            </View>
          </View>

          {snag.work_started_date && (
            <View style={styles.detailRow}>
              <Ionicons name="play-circle-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Work Started</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(snag.work_started_date)}
                </Text>
              </View>
            </View>
          )}

          {snag.work_completed_date && (
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Work Completed</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(snag.work_completed_date)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Authority Feedback */}
        {snag.authority_feedback && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authority Feedback</Text>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>{snag.authority_feedback}</Text>
            </View>
          </View>
        )}

        {/* Authority Comment */}
        {snag.authority_comment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authority Comment</Text>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>{snag.authority_comment}</Text>
            </View>
          </View>
        )}

        {/* Assigned Authorities - Multiple */}
        {(snag.assigned_authority_names?.length > 0 || snag.assigned_authority_name) && (
          <View style={styles.section}>
            <View style={styles.detailRow}>
              <Ionicons name="shield-checkmark" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Assigned Authorities</Text>
                <View style={styles.authoritiesList}>
                  {(snag.assigned_authority_names?.length > 0 
                    ? snag.assigned_authority_names 
                    : [snag.assigned_authority_name]
                  ).map((name, idx) => (
                    <View key={idx} style={styles.authorityTag}>
                      <Text style={styles.authorityTagText}>{name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            {isEditing && canEdit && (
              <TouchableOpacity 
                style={styles.editAuthoritiesButton}
                onPress={() => setShowAuthorityModal(true)}
              >
                <Ionicons name="pencil" size={16} color="#366092" />
                <Text style={styles.editAuthoritiesText}>Edit Authorities ({selectedAuthorityIds.length} selected)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Authority Selection Modal */}
        <Modal visible={showAuthorityModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Authorities</Text>
                <TouchableOpacity onPress={() => setShowAuthorityModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.authorityListModal}>
                {authorities.map((authority) => (
                  <TouchableOpacity
                    key={authority.id}
                    style={[
                      styles.authorityOption,
                      selectedAuthorityIds.includes(authority.id) && styles.authorityOptionSelected,
                    ]}
                    onPress={() => toggleAuthority(authority.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      selectedAuthorityIds.includes(authority.id) && { backgroundColor: '#366092' }
                    ]}>
                      {selectedAuthorityIds.includes(authority.id) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.authorityOptionText}>{authority.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setShowAuthorityModal(false)}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Contractor Completion Date */}
        {snag.contractor_completion_date && (
          <View style={styles.section}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#2ecc71" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Contractor Completion Date</Text>
                <Text style={styles.detailValue}>{formatDate(snag.contractor_completion_date)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        {canUpdateStatus() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            {/* Contractor Actions */}
            {isContractor && snag.status !== 'verified' && (
              <>
                {snag.status === 'open' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#f39c12' }]}
                    onPress={() => updateStatus('in_progress')}
                  >
                    <Ionicons name="play-circle" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Start Work</Text>
                  </TouchableOpacity>
                )}
                
                {(snag.status === 'in_progress' || snag.status === 'open') && !snag.contractor_completed && (
                  <View style={styles.completionSection}>
                    <Text style={styles.completionLabel}>Set Completion Date:</Text>
                    <TouchableOpacity
                      style={styles.dateSelector}
                      onPress={() => setShowCompletionDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={20} color="#366092" />
                      <Text style={styles.dateSelectorText}>
                        {contractorCompletionDate ? formatDate(contractorCompletionDate.toISOString()) : 'Select Date'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#2ecc71', marginTop: 12 }]}
                      onPress={submitContractorCompletion}
                    >
                      <Ionicons name="checkmark-done-circle" size={24} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark Work Complete</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {snag.contractor_completed && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                    <Text style={styles.completedText}>Work Completed - Awaiting Authority Approval</Text>
                  </View>
                )}
              </>
            )}

            {/* Manager Actions */}
            {user?.role === 'manager' && snag.status !== 'verified' && (
              <>
                {snag.status === 'open' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#f39c12' }]}
                    onPress={() => updateStatus('in_progress')}
                  >
                    <Ionicons name="play-circle" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Start Work</Text>
                  </TouchableOpacity>
                )}
                
                {snag.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#9b59b6' }]}
                    onPress={() => updateStatus('resolved')}
                  >
                    <Ionicons name="checkmark-done-circle" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Mark as Resolved</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Authority Actions */}
            {isAuthority && (snag.status === 'resolved' || snag.status === 'in_progress') && !snag.authority_approved && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#2ecc71' }]}
                onPress={() => setShowFeedbackModal(true)}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Approve & Add Feedback</Text>
              </TouchableOpacity>
            )}
            
            {isAuthority && snag.authority_approved && (
              <View style={styles.completedBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#2ecc71" />
                <Text style={styles.completedText}>Authority Approved</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Photo Viewer Modal */}
      {selectedPhotoIndex !== null && (
        <Modal visible transparent animationType="fade">
          <View style={styles.photoModal}>
            <TouchableOpacity
              style={styles.closePhotoButton}
              onPress={() => setSelectedPhotoIndex(null)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: snag.photos[selectedPhotoIndex] }}
              style={styles.fullPhoto}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Authority Feedback & Approval</Text>
            <Text style={styles.inputLabel}>Feedback (Required)</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Enter your feedback..."
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.inputLabel}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Enter additional comments..."
              value={authorityComment}
              onChangeText={setAuthorityComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={submitFeedback}
              >
                <Text style={styles.modalButtonTextSubmit}>Approve & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contractor Completion Date Picker */}
      <DateTimePickerModal
        isVisible={showCompletionDatePicker}
        mode="date"
        onConfirm={handleCompletionDateConfirm}
        onCancel={() => setShowCompletionDatePicker(false)}
      />

      {/* Contractor Selection Modal */}
      <Modal visible={showContractorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Contractor</Text>
            <ScrollView style={styles.contractorList}>
              <TouchableOpacity
                style={[
                  styles.contractorOption,
                  !editedSnag.assigned_contractor_id && styles.contractorOptionSelected,
                ]}
                onPress={() => {
                  setEditedSnag({ ...editedSnag, assigned_contractor_id: undefined });
                  setShowContractorModal(false);
                }}
              >
                <Text style={styles.contractorOptionText}>No Contractor</Text>
                {!editedSnag.assigned_contractor_id && (
                  <Ionicons name="checkmark" size={24} color="#366092" />
                )}
              </TouchableOpacity>
              {contractors.map((contractor) => (
                <TouchableOpacity
                  key={contractor.id}
                  style={[
                    styles.contractorOption,
                    editedSnag.assigned_contractor_id === contractor.id &&
                      styles.contractorOptionSelected,
                  ]}
                  onPress={() => {
                    setEditedSnag({ ...editedSnag, assigned_contractor_id: contractor.id });
                    setShowContractorModal(false);
                  }}
                >
                  <View>
                    <Text style={styles.contractorOptionText}>{contractor.name}</Text>
                    <Text style={styles.contractorEmail}>{contractor.email}</Text>
                  </View>
                  {editedSnag.assigned_contractor_id === contractor.id && (
                    <Ionicons name="checkmark" size={24} color="#366092" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 12 }]}
              onPress={() => setShowContractorModal(false)}
            >
              <Text style={styles.modalButtonTextCancel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerVisibility(false)}
        date={editedSnag.due_date ? new Date(editedSnag.due_date) : new Date()}
      />
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModeBar: {
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#366092',
  },
  editModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  editPhotoWrapper: {
    position: 'relative',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  addPhotoButton: {
    width: 150,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#366092',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  addPhotoText: {
    color: '#366092',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  noPhotosText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  editInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editInputSmall: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  priorityOptionSelected: {
    borderWidth: 2,
  },
  priorityHigh: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  priorityMedium: {
    borderColor: '#f39c12',
    backgroundColor: '#fef9f3',
  },
  priorityLow: {
    borderColor: '#27ae60',
    backgroundColor: '#f2fdf5',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  priorityTextSelected: {
    color: '#333',
  },
  contractorSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  contractorSelectorText: {
    fontSize: 15,
    color: '#333',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateSelectorText: {
    fontSize: 15,
    color: '#333',
  },
  contractorList: {
    maxHeight: 300,
  },
  contractorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contractorOptionSelected: {
    backgroundColor: '#e8f4f8',
  },
  contractorOptionText: {
    fontSize: 16,
    color: '#333',
  },
  contractorEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  feedbackBox: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#366092',
  },
  feedbackText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePhotoButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonSubmit: {
    backgroundColor: '#366092',
  },
  modalButtonTextCancel: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSubmit: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  completionSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f8f0',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  completedText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
    flex: 1,
  },
  authoritiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  authorityTag: {
    backgroundColor: 'rgba(54, 96, 146, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  authorityTagText: {
    fontSize: 13,
    color: '#366092',
    fontWeight: '500',
  },
  editAuthoritiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  editAuthoritiesText: {
    fontSize: 14,
    color: '#366092',
    fontWeight: '500',
  },
  authorityListModal: {
    maxHeight: 300,
  },
  authorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  authorityOptionSelected: {
    backgroundColor: 'rgba(54, 96, 146, 0.05)',
  },
  authorityOptionText: {
    fontSize: 16,
    color: '#333',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#366092',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modalDoneButton: {
    backgroundColor: '#366092',
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 12,
  },
  modalDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
