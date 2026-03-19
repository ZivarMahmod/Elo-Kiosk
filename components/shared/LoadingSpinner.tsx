/**
 * Shared loading spinner component
 */

import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

interface Props {
  message?: string;
  color?: string;
}

export function LoadingSpinner({ message = "Laddar...", color = "#2d6b5a" }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7c74",
  },
});
