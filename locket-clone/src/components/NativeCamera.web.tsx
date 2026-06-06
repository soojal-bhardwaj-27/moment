import React from 'react';
import { View, Text } from 'react-native';

export const CameraView = React.forwardRef((props: any, ref) => {
  return (
    <View {...props} style={[props.style, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#fff' }}>Camera not supported on Web.</Text>
      <Text style={{ color: '#fff' }}>Please use the Expo Go app on your phone.</Text>
    </View>
  );
});

export const useCameraPermissions = () => {
  return [{ granted: true }, () => {}];
};
