import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  fallback?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.message}>{this.props.fallback ?? this.state.error?.message}</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F14', justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { color: '#F0EFF8', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  message: { color: '#888899', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#7C6FFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#FFF', fontWeight: '600' },
});
