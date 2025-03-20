import React, { useState, useRef, useEffect } from "react";
import { Button, StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { Camera, CameraType } from 'expo-camera';
import {
  ViroVRSceneNavigator,
  ViroScene,
  ViroImage,
  ViroSkyBox,
  ViroNode,
  ViroSphere,
  ViroMaterials,
} from "@viro-community/react-viro";
import { DeviceMotion } from "expo-sensors";

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
      onCameraTransformUpdate: (transform: CameraTransform) => void;
      lastUpdateRef: React.MutableRefObject<number>;
      lastTransformRef: React.MutableRefObject<CameraTransform | null>;
    };
  };
}

// Define the circle material
ViroMaterials.createMaterials({
  circleMaterial: {
    diffuseColor: "rgba(235, 10, 10, 0.2)"
  },
});

// The scene component implementation
const MainScene = (props: SceneProps) => {
  const { lastUpdateRef, lastTransformRef } = props.sceneNavigator.viroAppProps;

  const [isLeft, setIsLeft] = useState(false);
  const [isRight, setIsRight] = useState(false);
  const [isUp, setIsUp] = useState(false);
  const [isDown, setIsDown] = useState(false);

  // Debounced camera transform handler
  const handleCameraTransform = (transform: CameraTransform) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 500 && JSON.stringify(transform) !== JSON.stringify(lastTransformRef.current)) {
      lastUpdateRef.current = now;
      lastTransformRef.current = transform;

      // Get the forward vector components
      const [forwardX, forwardY, forwardZ] = transform.forward;

      // Thresholds for movement detection
      const h_movementThreshold = 0.3; // Adjust this value based on sensitivity needed
      const v_movementThreshold = 0.1; // Adjust this value based on sensitivity needed
      // Determine direction based on forward vector
      // Forward vector points in the direction the camera is looking
      const isLeft = forwardX < -h_movementThreshold;
      const isRight = forwardX > h_movementThreshold;
      const isUp = forwardY > v_movementThreshold;
      const isDown = forwardY < -v_movementThreshold;

      // Update circle visibility based on camera direction
      setIsLeft(isLeft);
      setIsRight(isRight);
      setIsUp(isUp);
      setIsDown(isDown);

    }
  };


  const horizontalOffset = 0.75;
  const verticalOffset = 0.75;

  const circleCorners = [
    { position: [0, verticalOffset, 0], rotation: [0, 0, 0], visible: isUp },
    { position: [0, -verticalOffset, 0], rotation: [0, 0, 0], visible: isDown },
    { position: [-horizontalOffset, 0, 0], rotation: [0, 0, 0], visible: isLeft },
    { position: [horizontalOffset, 0, 0], rotation: [0, 0, 0], visible: isRight },
  ];

  return (
    <ViroScene onCameraTransformUpdate={handleCameraTransform}>
      <ViroSkyBox color={"#808080"} />
      {props.sceneNavigator.viroAppProps.capturedImages.map((image: CapturedImage, index: number) => (
        <ViroNode key={index} position={image.position} rotation={image.rotation} >
          {circleCorners.map((corner, index) => (
            <ViroSphere
              key={index}
              heightSegmentCount={20}
              widthSegmentCount={20}
              radius={0.1}
              position={corner.position as [number, number, number]}
              rotation={corner.rotation as [number, number, number]}
              materials={["circleMaterial"]}
              visible={corner.visible}
            />
          ))}
          {/* Actual image */}
          <ViroImage source={{ uri: image.uri }} width={1} height={1} />
        </ViroNode>
      ))}
    </ViroScene>
  );
};

// Main app component
export default () => {
  // Camera and image state
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [showCamera, setShowCamera] = useState(true);
  const cameraRef = useRef<Camera>(null);
  const TOTAL_IMAGES_NEEDED = 21; // Added constant for total images needed

  const [type, setType] = useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const lastUpdateRef = useRef<number>(0);
  const lastTransformRef = useRef<CameraTransform | null>(null);
  const [isVertical, setIsVertical] = useState(false);

  // Update the useEffect to handle circle color and animation
  useEffect(() => {
    DeviceMotion.setUpdateInterval(500);
    const subscription = DeviceMotion.addListener(({ accelerationIncludingGravity }) => {
      const newIsVertical = accelerationIncludingGravity.z > -0.98 && accelerationIncludingGravity.z < 0.98;
      setIsVertical(newIsVertical);

      // Update circle color based on vertical alignment

    });

    return () => { subscription.remove(); };
  }, []);

  // Function to handle completion of all photos
  const handleAllPhotosCaptured = () => {
    Alert.alert(
      "All Photos Captured",
      "You have captured all 21 photos. Would you like to continue taking more photos?",
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

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!lastTransformRef.current) {
        return;
      }

      // Calculate the position for the new image
      const distance = 1.5;
      const forward = lastTransformRef.current.forward;
      const newPosition: [number, number, number] = [
        forward[0] * distance,
        forward[1] * distance,
        forward[2] * distance
      ];



      // Add new image to state with rotation
      const newImage: CapturedImage = {
        uri: photo.uri,
        position: newPosition,
        rotation: lastTransformRef.current.rotation
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

    } catch (error) {
      console.error("Failed to take picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  // Function to retake last photo
  const retakeLastPhoto = () => {
    if (capturedImages.length > 0) {
      setCapturedImages(prevImages => prevImages.slice(0, -1));
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
          }
        }
      ]
    );
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
          lastTransformRef,
        }}
      />

      <View style={styles.cameraContainer}>
        <Camera ref={cameraRef} type={type} style={[styles.camera, { opacity: showCamera ? 1 : 0 }]} />
        <View style={[styles.whiteCircle, { backgroundColor: isVertical && showCamera ? 'rgba(46, 204, 113, 0.6)' : 'rgba(255, 255, 255, 0.5)' }]}></View>
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
              : "Align the white circle with the red target to capture an image"}
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
    width: 50,
    height: 50,
    backgroundColor: '#ffffff',
    transform: [{ translateX: -25 }, { translateY: -25 }],
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
}); 