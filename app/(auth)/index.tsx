import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';

const VIOLET_LOGO_URL =
  'https://tozcnwpdzolqolgyijxr.supabase.co/storage/v1/object/sign/brand%20assets/violet%20logo%202.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZDdhNGMzYy05ZTVhLTQ2OGItOGJhOC04ZjBlNjE5YWM1MGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJicmFuZCBhc3NldHMvdmlvbGV0IGxvZ28gMi5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgxMDU4NTU3LCJleHAiOjI0MTE3Nzg1NTd9.ei3yO11VBFttYmUOeysc6v9dFJOKlf2S6wPBDkzq-EM';

export default function Welcome() {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.backgroundMuted, colors.background]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: VIOLET_LOGO_URL }}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="Violet logo"
              />
              <Text style={[styles.logoText, { color: colors.primary }]}>
                Violet
              </Text>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Chat, meet and connect with women near you
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  hero: {
    alignItems: 'center',
    width: '100%',
    gap: 24,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 220,
    height: 220,
    marginBottom: 12,
  },
  logoText: {
    fontFamily: 'Times New Roman',
    fontSize: 42,
    textTransform: 'uppercase',
    letterSpacing: 60,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 360,
    gap: 16,
    alignItems: 'center',
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