/**
 * VideoBackground — loop video full-screen cu overlay gradient
 */
import { useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const { width: W, height: H } = Dimensions.get('window');

export default function VideoBackground() {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setIsLoopingAsync(true);
      videoRef.current.playAsync();
    }
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Video
        ref={videoRef}
        source={require('../assets/bg-car.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
      />
      {/* Overlay gradient — face conținutul lizibil peste video */}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: W,
    height: H,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 1, 15, 0.78)',
  },
});
