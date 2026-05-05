import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/src/store/useAuthStore';


export default function Login() {
  const { colors } = useTheme();
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
  
    setLoading(true);
    setError('');
  
    try {
      const response = await signIn({
        email,
        password,
      });
  
      if (!response.success) {
        setError(response.message);
        return;
      }
  
      router.replace('/(tabs)');
    } catch (error) {
      setError('Error logging in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Login</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Welcome back! Please enter your details
          </Text>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.cardBackground,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    { 
                      backgroundColor: colors.cardBackground,
                      color: colors.text,
                      borderColor: colors.border
                    }
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPassword, { color: colors.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
            
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </Pressable>
          </View>
          
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: colors.textSecondary }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => router.replace('/signup')}>
              <Text style={[styles.signupLink, { color: colors.primary }]}>
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginBottom: 32,
  },
  errorText: {
    color: '#ff4d4f',
    marginBottom: 16,
    fontFamily: 'Inter-Medium',
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  input: {
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontFamily: 'Inter-Regular',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontFamily: 'Inter-Regular',
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
  },
  forgotPassword: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  signupText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  signupLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});