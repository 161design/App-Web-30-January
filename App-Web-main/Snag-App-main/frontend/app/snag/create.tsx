import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUTMLocation } from '../../utils/gpsToUTM';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { formatDate } from '../../utils/dateFormat';
import { BACKEND_URL } from '../../config/api';
import PhotoAnnotation from '../components/PhotoAnnotation';

interface Contractor {
  id: string;
  name: string;
}

export default function CreateSnagScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [projectName, setProjectName] = useState('');
  const [possibleSolution, setPossibleSolution] = useState('');
  const [utmCoordinates, setUtmCoordinates] = useState('');
  const [priority, setPriority] = useState('medium');
  const [costEstimate, setCostEstimate] = useState('');
  const [assignedContractorId, setAssignedContractorId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<string[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [annotatingPhotoIndex, setAnnotatingPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchContractors();
    fetchProjectNames();
    requestPermissions();
    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    // Filter projects as user types
    if (projectName) {
      const filtered = projectNames.filter(name =>
        name.toLowerCase().includes(projectName.toLowerCase())
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projectNames);
    }
  }, [projectName, projectNames]);

  const fetchProjectNames = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/projects/names`);
      setProjectNames(response.data.projects || []);
    } catch (error) {
      console.error('Error fetching project names:', error);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and gallery permissions are required to take photos');
    }
  };

  const fetchContractors = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users/contractors`);
      setContractors(response.data);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    }
  };

  const fetchCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const utm = await getCurrentUTMLocation();
      if (utm) {
        setUtmCoordinates(utm);
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission denied. You can still enter coordinates manually if needed.'
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable default editing, we have our own
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const newIndex = photos.length;
        setPhotos([...photos, base64Image]);
        // Open annotation modal for the new photo
        setAnnotatingPhotoIndex(newIndex);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    // Only managers can pick from gallery
    if (user?.role !== 'manager') {
      Alert.alert('Permission Denied', 'Only managers can select photos from gallery');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable default editing, we have our own
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const newIndex = photos.length;
        setPhotos([...photos, base64Image]);
        // Open annotation modal for the new photo
        setAnnotatingPhotoIndex(newIndex);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAnnotationSave = (annotatedPhoto: string) => {
    if (annotatingPhotoIndex !== null) {
      setPhotos(photos.map((photo, i) => i === annotatingPhotoIndex ? annotatedPhoto : photo));
    }
    setAnnotatingPhotoIndex(null);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description || !location || !projectName) {
      Alert.alert('Error', 'Please fill in project name, location, and description');
      return;
    }

    // Convert due date from DD-MM-YYYY to ISO format
    let dueDateISO = null;
    if (dueDate) {
      const parts = dueDate.split('-');
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        dueDateISO = new Date(isoDate).toISOString();
      }
    }

    setIsLoading(true);
    try {
      const snagData = {
        description,
        location,
        project_name: projectName,
        possible_solution: possibleSolution || null,
        utm_coordinates: utmCoordinates || null,
        priority,
        photos,
        cost_estimate: costEstimate ? parseFloat(costEstimate) : null,
        assigned_contractor_id: assignedContractorId || null,
        due_date: dueDateISO,
      };

      await axios.post(`${BACKEND_URL}/api/snags`, snagData);
      Alert.alert('Success', 'Snag created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating snag:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create snag');
    } finally {
      setIsLoading(false);
    }
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirmDate = (date: Date) => {
    const formatted = formatDate(date);
    setDueDate(formatted);
    setSelectedDate(date);
    hideDatePicker();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Snag</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Project/Building Name *</Text>
          
          {projectNames.length > 0 && (
            <Text style={styles.helpText}>Type to search or select from previous:</Text>
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Type project/building name"
            value={projectName}
            onChangeText={setProjectName}
          />
          
          {/* Auto-suggestions while typing */}
          {filteredProjects.length > 0 && projectName && (
            <View style={styles.suggestionsContainer}>
              {filteredProjects.slice(0, 5).map((name, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setProjectName(name);
                    setFilteredProjects([]);
                  }}
                >
                  <Ionicons name="business" size={16} color="#366092" />
                  <Text style={styles.suggestionText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Terrace-Block-14 to Block-8"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>GPS Coordinates (UTM)</Text>
          <View style={styles.locationContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Auto-captured or enter manually"
              value={utmCoordinates}
              onChangeText={setUtmCoordinates}
              editable={!isLoadingLocation}
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={fetchCurrentLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color="#366092" />
              ) : (
                <Ionicons name="location" size={20} color="#366092" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>Auto-captured on load or tap to refresh</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Possible Solution (For Contractor Attention)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Suggest a possible solution..."
            value={possibleSolution}
            onChangeText={setPossibleSolution}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityContainer}>
            {['low', 'medium', 'high'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  priority === p && styles.priorityButtonActive,
                  p === 'high' && priority === p && { backgroundColor: '#e74c3c' },
                  p === 'medium' && priority === p && { backgroundColor: '#f39c12' },
                  p === 'low' && priority === p && { backgroundColor: '#2ecc71' },
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === p && styles.priorityButtonTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Cost Estimate</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter estimated cost"
            value={costEstimate}
            onChangeText={setCostEstimate}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Assign Contractor</Text>
          <View style={styles.contractorList}>
            <TouchableOpacity
              style={[
                styles.contractorOption,
                !assignedContractorId && styles.contractorOptionSelected,
              ]}
              onPress={() => setAssignedContractorId('')}
            >
              <View style={styles.radioButton}>
                {!assignedContractorId && <View style={styles.radioButtonSelected} />}
              </View>
              <Text style={styles.contractorName}>None</Text>
            </TouchableOpacity>
            {contractors.map((contractor) => (
              <TouchableOpacity
                key={contractor.id}
                style={[
                  styles.contractorOption,
                  assignedContractorId === contractor.id && styles.contractorOptionSelected,
                ]}
                onPress={() => setAssignedContractorId(contractor.id)}
              >
                <View style={styles.radioButton}>
                  {assignedContractorId === contractor.id && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Text style={styles.contractorName}>{contractor.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Due Date</Text>
          <View style={styles.datePickerContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="DD-MM-YYYY"
              value={dueDate}
              onChangeText={setDueDate}
              editable={true}
            />
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={showDatePicker}
            >
              <Ionicons name="calendar" size={24} color="#366092" />
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>Tap calendar to select or type DD-MM-YYYY</Text>
        </View>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={hideDatePicker}
          minimumDate={new Date()}
        />

        <View style={styles.section}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#366092" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#366092" />
              <Text style={styles.photoButtonText}>Gallery</Text>
              {user?.role !== 'manager' && (
                <Text style={styles.photoButtonSubtext}>(Manager only)</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {photos.length > 0 && (
            <Text style={styles.annotateHint}>Tap a photo to annotate with circles</Text>
          )}

          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.photoContainer}
                onPress={() => setAnnotatingPhotoIndex(index)}
              >
                <Image source={{ uri: photo }} style={styles.photo} />
                <View style={styles.annotateOverlay}>
                  <Ionicons name="create" size={16} color="#fff" />
                </View>
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#e74c3c" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo Annotation Modal */}
        {annotatingPhotoIndex !== null && photos[annotatingPhotoIndex] && (
          <PhotoAnnotation
            photo={photos[annotatingPhotoIndex]}
            visible={true}
            onSave={handleAnnotationSave}
            onClose={() => setAnnotatingPhotoIndex(null)}
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Create Snag</Text>
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
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
  },
  locationContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderColor: 'transparent',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  contractorList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  contractorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contractorOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#366092',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#366092',
  },
  contractorName: {
    fontSize: 16,
    color: '#333',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoButtonText: {
    fontSize: 14,
    color: '#366092',
    fontWeight: '500',
  },
  photoButtonSubtext: {
    fontSize: 11,
    color: '#999',
  },
  annotateHint: {
    fontSize: 12,
    color: '#366092',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  annotateOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(54, 96, 146, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
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
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
});
