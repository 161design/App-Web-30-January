import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import Svg, { Ellipse } from 'react-native-svg';

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

interface Annotation {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

interface PhotoAnnotationProps {
  photo: string;
  visible: boolean;
  onSave: (annotatedPhoto: string) => void;
  onClose: () => void;
}

export default function PhotoAnnotation({ photo, visible, onSave, onClose }: PhotoAnnotationProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ef4444'); // Default red
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const viewRef = useRef<View>(null);
  const [isSaving, setIsSaving] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Calculate image dimensions to fit screen
  const calculateImageSize = useCallback(() => {
    Image.getSize(photo, (width, height) => {
      const maxWidth = screenWidth - 40;
      const maxHeight = screenHeight - 300;
      
      let newWidth = width;
      let newHeight = height;
      
      if (width > maxWidth) {
        newHeight = (height * maxWidth) / width;
        newWidth = maxWidth;
      }
      if (newHeight > maxHeight) {
        newWidth = (newWidth * maxHeight) / newHeight;
        newHeight = maxHeight;
      }
      
      setImageSize({ width: newWidth, height: newHeight });
    }, (error) => {
      console.error('Error getting image size:', error);
      setImageSize({ width: screenWidth - 40, height: 300 });
    });
  }, [photo, screenWidth, screenHeight]);

  React.useEffect(() => {
    if (visible && photo) {
      calculateImageSize();
      setAnnotations([]);
    }
  }, [visible, photo, calculateImageSize]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentAnnotation({
          startX: locationX,
          startY: locationY,
          endX: locationX,
          endY: locationY,
          color: selectedColor,
        });
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentAnnotation(prev => prev ? {
          ...prev,
          endX: locationX,
          endY: locationY,
        } : null);
      },
      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (currentAnnotation) {
          const width = Math.abs(locationX - currentAnnotation.startX);
          const height = Math.abs(locationY - currentAnnotation.startY);
          
          // Only add if it has some size
          if (width > 10 && height > 10) {
            setAnnotations(prev => [...prev, {
              ...currentAnnotation,
              endX: locationX,
              endY: locationY,
            }]);
          }
        }
        setCurrentAnnotation(null);
      },
    })
  ).current;

  // Update panResponder color when selectedColor changes
  React.useEffect(() => {
    panResponder.panHandlers.onPanResponderGrant = (evt: any) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentAnnotation({
        startX: locationX,
        startY: locationY,
        endX: locationX,
        endY: locationY,
        color: selectedColor,
      });
    };
  }, [selectedColor]);

  const handleUndo = () => {
    setAnnotations(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setAnnotations([]);
  };

  const handleSave = async () => {
    if (!viewRef.current) return;
    
    setIsSaving(true);
    try {
      const uri = await captureRef(viewRef, {
        format: 'jpg',
        quality: 0.9,
        result: 'base64',
      });
      onSave(`data:image/jpeg;base64,${uri}`);
    } catch (error) {
      console.error('Error saving annotation:', error);
      // Fallback: return original photo if capture fails
      onSave(photo);
    } finally {
      setIsSaving(false);
    }
  };

  const renderEllipse = (ann: Annotation, index: number) => {
    const cx = (ann.startX + ann.endX) / 2;
    const cy = (ann.startY + ann.endY) / 2;
    const rx = Math.abs(ann.endX - ann.startX) / 2;
    const ry = Math.abs(ann.endY - ann.startY) / 2;
    
    return (
      <Ellipse
        key={index}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        stroke={ann.color}
        strokeWidth={3}
        fill="transparent"
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Annotate Photo</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.saveButton}
            disabled={isSaving}
          >
            <Ionicons name="checkmark" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Color Picker */}
        <View style={styles.colorPicker}>
          <Text style={styles.colorLabel}>Color:</Text>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color.value}
              onPress={() => setSelectedColor(color.value)}
              style={[
                styles.colorButton,
                { backgroundColor: color.value },
                selectedColor === color.value && styles.colorButtonSelected,
                color.value === '#ffffff' && styles.colorButtonWhite,
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={handleUndo} 
            style={[styles.actionButton, annotations.length === 0 && styles.actionButtonDisabled]}
            disabled={annotations.length === 0}
          >
            <Ionicons name="arrow-undo" size={20} color={annotations.length === 0 ? '#999' : '#366092'} />
            <Text style={[styles.actionButtonText, annotations.length === 0 && styles.actionButtonTextDisabled]}>
              Undo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleClear} 
            style={[styles.actionButton, annotations.length === 0 && styles.actionButtonDisabled]}
            disabled={annotations.length === 0}
          >
            <Ionicons name="trash" size={20} color={annotations.length === 0 ? '#999' : '#e74c3c'} />
            <Text style={[styles.actionButtonText, annotations.length === 0 && styles.actionButtonTextDisabled]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>
          Draw circles/ellipses by dragging on the image
        </Text>

        {/* Canvas Area */}
        <View style={styles.canvasContainer}>
          <View
            ref={viewRef}
            style={[styles.imageContainer, { width: imageSize.width, height: imageSize.height }]}
            {...panResponder.panHandlers}
            collapsable={false}
          >
            <Image
              source={{ uri: photo }}
              style={{ width: imageSize.width, height: imageSize.height }}
              resizeMode="contain"
            />
            <Svg
              style={StyleSheet.absoluteFill}
              width={imageSize.width}
              height={imageSize.height}
            >
              {annotations.map((ann, index) => renderEllipse(ann, index))}
              {currentAnnotation && renderEllipse(currentAnnotation, -1)}
            </Svg>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
            disabled={isSaving}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.confirmButtonText}>
              {isSaving ? 'Saving...' : 'Save Annotation'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#366092',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    gap: 10,
  },
  colorLabel: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#fff',
    transform: [{ scale: 1.15 }],
  },
  colorButtonWhite: {
    borderColor: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 10,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    gap: 6,
  },
  actionButtonDisabled: {
    backgroundColor: '#444',
  },
  actionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonTextDisabled: {
    color: '#999',
  },
  instructions: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    paddingVertical: 8,
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#000',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2a2a2a',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#444',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#366092',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
