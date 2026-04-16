import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';

export default function Welcome() {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.backgroundMuted, colors.background]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={[styles.logo, { color: colors.primary }]}>xxplore</Text>
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Chat, meet and connect with amazing people around you
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.buttonText}>Create an account</Text>
              <ArrowRight size={20} color="#fff" />
            </Pressable>
            
            <Pressable
              style={[styles.buttonSecondary]}
              onPress={() => router.push('/login')}
            >
              <Text style={[styles.buttonSecondaryText, { color: colors.text }]}>
                Login
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  logo: {
    fontFamily: 'Inter-Bold',
    fontSize: 42,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 48,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%',
    backgroundColor: 'transparent',
  },
  buttonSecondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});