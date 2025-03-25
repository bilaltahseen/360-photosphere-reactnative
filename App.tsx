import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert, Animated, Easing, Image } from "react-native";
import { Camera, CameraType } from 'expo-camera';
import {
  ViroVRSceneNavigator,
  ViroScene,
  ViroImage,
  ViroNode,
  ViroSphere,
  ViroMaterials,
  ViroCamera,
} from "@reactvision/react-viro";
import { Accelerometer } from "expo-sensors";


// Define types
interface CapturedImage {
  uri: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

// Define additional types
interface CameraTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  forward: [number, number, number];
  up: [number, number, number];
}

// Define the scene props interface
interface SceneProps {
  sceneNavigator: {
    viroAppProps: {
      capturedImages: CapturedImage[];
      handleCameraTransform: (transform: CameraTransform) => void;
      lastUpdateRef: React.MutableRefObject<number>;
      lastTransform: CameraTransform | null;
      isCameraAvailable: boolean;
      viroCameraRef: React.MutableRefObject<ViroCamera | null>;
      markerPositions: { x: number, y: number, z: number, visible: boolean, removed: boolean }[];
      showCamera: boolean;
    }
  };
}

// Define the circle material
ViroMaterials.createMaterials({
  visibleMaterial: {
    diffuseColor: "rgba(235, 10, 10, 0.8)"
  },
  invisibleMaterial: {
    diffuseColor: "rgba(255, 255, 255, 0.0)"
  }
});





// The scene component implementation
const MainScene = (props: SceneProps) => {
  const { isCameraAvailable, viroCameraRef, markerPositions, showCamera, handleCameraTransform } = props.sceneNavigator.viroAppProps;

  return (
    <ViroScene onCameraTransformUpdate={handleCameraTransform}>
      {isCameraAvailable && <ViroCamera ref={viroCameraRef} position={[0, 0, 0]} rotation={[0, 90, 0]} active={true} />}
      {!showCamera && markerPositions.map((pos, i) => (
        pos.removed ? null : (
          <ViroSphere
            key={i}
            position={[pos.x, pos.y, pos.z]}
            radius={0.09}
            materials={pos.visible ? ["visibleMaterial"] : ["invisibleMaterial"]}
          />
        )
      ))}
      {props.sceneNavigator.viroAppProps.capturedImages.map((image: CapturedImage, index: number) => (
        <ViroNode key={index} position={image.position} rotation={image.rotation} >
          <ViroImage source={{ uri: image.uri }} width={1} height={1} />
        </ViroNode>
      ))}
    </ViroScene>
  )
};

// Main app component
export default () => {
  // Camera and image state
  const [isReady, setIsReady] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [showCamera, setShowCamera] = useState(true);
  const cameraRef = useRef<Camera>(null);
  const TOTAL_IMAGES_NEEDED = 22; // Added constant for total images needed

  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const lastUpdateRef = useRef<number>(0);
  const [lastTransform, setLastTransform] = useState<CameraTransform | null>(null);
  const [isVertical, setIsVertical] = useState(false);
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const viroCameraRef = useRef<ViroCamera>(null);
  const [isMarkerAligned, setIsMarkerAligned] = useState(false);
  const [lastMarkerIndex, setLastMarkerIndex] = useState(0);

  const radius = 1;
  const [markerPositions, setMarkerPositions] = useState<{ x: number, y: number, z: number, visible: boolean, removed: boolean }[]>(
    [
      { x: 0, y: radius, z: 0, visible: true, removed: false },
      { x: radius * Math.cos(Math.PI / 4), y: 1, z: radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: 0, y: 1, z: radius, visible: true, removed: false },
      { x: -radius * Math.cos(Math.PI / 4), y: 1, z: radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: -radius, y: 1, z: 0, visible: true, removed: false },
      { x: -radius * Math.cos(Math.PI / 4), y: 1, z: -radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: 0, y: 1, z: -radius, visible: true, removed: false },
      { x: radius, y: 0, z: 0, visible: true, removed: false },
      { x: radius * Math.cos(Math.PI / 4), y: 0, z: radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: 0, y: 0, z: radius, visible: true, removed: false },
      { x: -radius * Math.cos(Math.PI / 4), y: 0, z: radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: -radius, y: 0, z: 0, visible: true, removed: false },
      { x: -radius * Math.cos(Math.PI / 4), y: 0, z: -radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: 0, y: 0, z: -radius, visible: true, removed: false },
      { x: radius * Math.cos(Math.PI / 4), y: 0, z: -radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: radius * Math.cos(Math.PI / 4), y: -1, z: radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: 0, y: -1, z: radius, visible: true, removed: false },
      { x: -radius * Math.cos(Math.PI / 4), y: -1, z: radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: -radius, y: -1, z: 0, visible: true, removed: false },
      { x: -radius * Math.cos(Math.PI / 4), y: -1, z: -radius * Math.sin(Math.PI / 4), visible: true, removed: false },
      { x: 0, y: -1, z: -radius, visible: true, removed: false },
      { x: 0, y: -radius, z: 0, visible: true, removed: false },
    ]);

  const opacity = useRef(new Animated.Value(1)).current;


  const _toggleAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.2, // Minimum opacity
        duration: 500, // Flicker speed
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, // Back to full opacity
        duration: 500,
        useNativeDriver: true,
      }),
    ])
  )

  // Debounced camera transform handler
  const handleCameraTransform = (transform: CameraTransform) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 800 && JSON.stringify(transform) !== JSON.stringify(lastTransform)) {
      lastUpdateRef.current = now;
      setLastTransform(transform);
    }
  };


  const isMarkerVisible = (markerPos: { x: number, y: number, z: number }, cameraPos: [number, number, number]) => {

    const forward = cameraPos;
    const markerVector = [markerPos.x, markerPos.y, markerPos.z];

    // Calculate dot product
    const dotProduct = forward[0] * markerVector[0] + forward[1] * markerVector[1] + forward[2] * markerVector[2];

    // Normalize the marker vector
    const markerLength = Math.sqrt(markerVector[0] ** 2 + markerVector[1] ** 2 + markerVector[2] ** 2);
    const normalizedDot = dotProduct / markerLength;

    // If dot product is close to 1, camera is facing the marker
    return normalizedDot > 0.99;
  };

  useEffect(() => {

    if (!lastTransform) return;

    if (!isReady) return;

    if (showCamera) return;

    let anyMarkerAligned = false;
    for (let i = 0; i < markerPositions.length; i++) {
      if (!markerPositions[i].removed && isMarkerVisible(markerPositions[i], lastTransform.forward)) {
        anyMarkerAligned = true;
        break;
      }
    }
    setIsMarkerAligned(anyMarkerAligned);
  }, [lastTransform])

  useEffect(() => {
    if (isMarkerAligned) {
      _toggleAnimation.start();
    } else {
      _toggleAnimation.stop();
    }
  }, [isMarkerAligned])


  useEffect(() => {
    if (!isReady) return;
    setTimeout(() => {
      setIsCameraAvailable(true);
    }, 1000);
  }, [isReady]);

  useEffect(() => {

    if (!isReady) return;

    if (!showCamera) return;

    Accelerometer.setUpdateInterval(500);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const newIsVertical = Math.round(Math.abs(z) * 100) / 100 >= 0 && Math.round(Math.abs(z) * 100) / 100 <= 0.09;
      setIsVertical(newIsVertical);
    });

    return () => { subscription.remove(); };
  }, [isReady, showCamera]);


  // Function to handle completion of all photos
  const handleAllPhotosCaptured = () => {
    Alert.alert(
      "All Photos Captured",
      `You have captured all ${TOTAL_IMAGES_NEEDED} photos. Would you like to continue taking more photos?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // Disable the capture button
            setCapturedImages(prevImages => prevImages.slice(0, TOTAL_IMAGES_NEEDED));
          }
        },
        {
          text: "Continue",
          onPress: () => {
            resetAllImages();
          }
        }
      ]
    );
  };

  // Modify the takePicture function to check for completion
  const takePicture = async () => {

    if (!cameraRef.current) {
      Alert.alert("Error", "Camera not ready, please try again");
      return;
    }

    const _handlePictureSaved = (photo: { uri: string }) => {

      try {
        if (!lastTransform) return;

        // Calculate the position for the new image
        const distance = 1;
        const forward = lastTransform.forward.map(value => value * distance);
        forward[1] = Math.round(forward[1] * 100) / 100;
        const newPosition: [number, number, number] = [forward[0], forward[1], forward[2]];


        for (let i = 0; i < markerPositions.length; i++) {
          if (isMarkerVisible(markerPositions[i], newPosition)) {
            const newMarkerPositions = [...markerPositions];
            newMarkerPositions[i].removed = true;
            setMarkerPositions(newMarkerPositions);
            setLastMarkerIndex(i);
          }
        }

        // Add new image to state with rotation
        const newImage: CapturedImage = {
          uri: photo.uri,
          position: newPosition,
          rotation: lastTransform.rotation
        };

        // Update state with new image
        setCapturedImages(prevImages => {
          const newImages = [...prevImages, newImage];
          // Check if we've reached the total number of images
          if (newImages.length === TOTAL_IMAGES_NEEDED) {
            // Use setTimeout to ensure the state update is complete
            setTimeout(handleAllPhotosCaptured, 100);
          }
          return newImages;
        });

        // Hide the camera after the first picture
        setShowCamera(false);

        if (isVertical) {
          setIsVertical(false);
        }

      } catch (error) {
        console.error("Failed to take picture:", error);
        Alert.alert("Error", "Failed to capture image. Please try again.");
      }
    }

    try {
      await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true, onPictureSaved: _handlePictureSaved });

    } catch (error) {
      console.error("Failed to take picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  // Function to retake last photo
  const retakeLastPhoto = () => {
    if (capturedImages.length > 0) {
      setCapturedImages(prevImages => prevImages.slice(0, -1));

      const newMarkerPositions = [...markerPositions];
      newMarkerPositions[lastMarkerIndex].removed = false;
      setMarkerPositions(newMarkerPositions);

      setIsVertical(false);

      // Removed setShowCamera(true) to keep camera hidden
    }
  };

  // Function to reset all images
  const resetAllImages = () => {
    Alert.alert(
      "Reset All Images",
      "Are you sure you want to delete all captured images?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setCapturedImages([]);
            setShowCamera(true);
            setIsVertical(false);
            setIsMarkerAligned(false);
            setMarkerPositions(markerPositions.map(pos => ({ ...pos, removed: false })));
            setLastMarkerIndex(0);
            setLastTransform(null);
            setIsReady(false)
          }
        }
      ]
    );
  };

  const handleGetStarted = () => {
    setIsReady(true);
  };

  // Handle camera permissions
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>Initializing camera permissions...</Text>
          <View style={styles.loadingIndicator}>
            <View style={styles.loadingDot} />
            <View style={styles.loadingDot} />
            <View style={styles.loadingDot} />
          </View>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            This app needs access to your camera to capture images for the 3D experience.
          </Text>
          <Text style={styles.permissionSubtext}>
            Your photos will only be stored locally on your device.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Welcome to PhotoSphere360</Text>
          <Text style={styles.permissionText}>
            Create stunning 360° panoramas by following these simple steps:
          </Text>
          <View style={styles.instructionList}>
            <Text style={styles.instructionItem}>
              1. Hold your device vertically and stay in one position
            </Text>
            <Text style={styles.instructionItem}>
              2. Align the white circle with each red target point
            </Text>
            <Text style={styles.instructionItem}>
              3. Capture 22 images to complete your panorama
            </Text>
            <Text style={styles.instructionItem}>
              4. Review and save your 360° creation
            </Text>
          </View>
          <TouchableOpacity style={styles.permissionButton} onPress={handleGetStarted}>
            <Text style={styles.permissionButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <ViroVRSceneNavigator
        style={styles.f1}
        vrModeEnabled={false}
        initialScene={{ scene: MainScene }}
        viroAppProps={{
          capturedImages,
          lastUpdateRef,
          lastTransform,
          isCameraAvailable,
          viroCameraRef,
          markerPositions,
          showCamera,
          handleCameraTransform,
        }}
      />

      <View style={styles.cameraContainer}>
        <Camera ref={cameraRef} type={type} style={[styles.camera, { opacity: showCamera ? 1 : 0 }]} />
        <Animated.View style={[styles.whiteCircle, { backgroundColor: isVertical || isMarkerAligned ? 'rgba(46, 204, 113, 0.6)' : 'rgba(255, 255, 255, 0.5)', opacity: opacity }]}></Animated.View>
      </View>

      {/* Image Counter */}
      <View style={styles.imageCounterContainer}>
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {capturedImages.length}/{TOTAL_IMAGES_NEEDED} Images
          </Text>
        </View>

        <View style={styles.helperTextContainer}>
          <Text style={styles.helperText}>
            {showCamera
              ? isVertical
                ? "Perfect! Tap the button to capture"
                : "Hold your device vertically until the circle turns green"
              : "Align the white circle with the red target until the circle turns green to capture an image"}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            capturedImages.length >= TOTAL_IMAGES_NEEDED && styles.captureButtonDisabled
          ]}
          onPress={takePicture}
          disabled={capturedImages.length >= TOTAL_IMAGES_NEEDED}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        <View style={styles.bottomButtonsContainer}>
          {!showCamera && capturedImages.length >= 2 && (
            <TouchableOpacity style={styles.retakeButton} onPress={retakeLastPhoto}>
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
          )}
          {capturedImages.length > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={resetAllImages}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#888',
    marginBottom: 25,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissionButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 10,
    shadowColor: '#4361ee',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingIndicator: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4361ee',
    margin: 5,
    opacity: 0.6,
  },
  f1: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -100 }, // Adjusted for new width
      { translateY: -100 }  // Centered vertically
    ],
    width: 200,
    height: 200, // Made square for better centering
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'white',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  retakeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flipButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
    zIndex: 10,
  },
  flipText: {
    color: '#fff',
    fontSize: 12,
  },
  modeButton: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
    zIndex: 10,
  },
  modeText: {
    color: '#fff',
    fontSize: 12,
  },
  imageCount: {
    position: 'absolute',
    top: 10,
    right: 10,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 5,
    zIndex: 10,
  },
  reticle: {
    position: 'absolute',
    top: '50%',
    left: '50%',

  },
  reticleInner: {
    width: 10,
    height: 10,
    backgroundColor: '#ffffff',
    borderRadius: 5,
  },
  whiteCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 65,
    height: 65,
    backgroundColor: '#ffffff',
    transform: [{ translateX: -32.5 }, { translateY: -32.5 }],
    opacity: 0.5,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  imageCircle: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 1.0)',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  imageCounterContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  imageCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  helperTextContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxWidth: '80%',
    alignSelf: 'center',
  },
  helperText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  instructionList: {
    marginBottom: 20,
  },
  instructionItem: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
}); 