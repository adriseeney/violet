import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { createUserProfile } from '@/services/users';
import { createUserPreferences } from '@/services/users';
import { useAuthStore } from '@/src/store/useAuthStore';



export default function Signup() {
  const { colors } = useTheme();
  const signUp = useAuthStore((state) => state.signUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  


  const handleSignup = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password ) {
      setError("Please fill in all required fields");
      return;
    }
  
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
  
    setLoading(true);
    setError("");
  
    try {
      const authResponse = await signUp({
        email: trimmedEmail,
        password
      });
  
      if (!authResponse.success) {
        setError(authResponse.message);
        return;
      }
  
      const authUserId = authResponse.data?.user?.id;
  
      if (!authUserId) {
        setError("User account created, but no user ID was returned.");
        return;
      }

      if (!authResponse.data?.session) {
        setError("Account created. Please confirm your email, then log in.");
        return;
      }
  
      const profileResponse = await createUserProfile({
        id: authUserId,
        email: trimmedEmail,
        display_name: trimmedUsername,
      });
  
      if (!profileResponse.success) {
        setError(profileResponse.message);
        return;
      }
  
      const preferencesResponse = await createUserPreferences({
        user_id: authUserId,
        distance_radius_miles: 25,
        is_discoverable: true,
      });
  
      if (!preferencesResponse.success) {
        setError(preferencesResponse.message);
        return;
      }
  
      router.replace("/(tabs)");
    } catch {
      setError("Error creating account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignup = () => {
    setLoading(true);
    // Simulating login with Facebook
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 1500);
  };

  const handleGoogleSignup = () => {
    setLoading(true);
    // Simulating login with Google
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 1500);
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
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            
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
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.cardBackground,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                placeholder="Choose a username"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
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
                  placeholder="Create a password"
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
              <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>
                Password must be at least 6 characters
              </Text>
            </View>

            
            
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialButtonsContainer}>
            <Pressable
              style={[styles.socialButton, { backgroundColor: '#1877F2', marginBottom: 12 }]}
              onPress={handleFacebookSignup}
              disabled={loading}
            >
              <View style={styles.socialIconContainer}>
                <Text style={styles.socialIcon}>f</Text>
              </View>
              <Text style={styles.socialButtonText}>Sign Up with Facebook</Text>
            </Pressable>

            <Pressable
              style={[styles.socialButton, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.border }]}
              onPress={handleGoogleSignup}
              disabled={loading}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={[styles.socialButtonText, { color: '#000000' }]}>Sign Up with Google</Text>
            </Pressable>
          </View>
          
          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              By signing up, you agree to our{' '}
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                Privacy Policy
              </Text>
            </Text>
          </View>
          
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    paddingBottom: 32,
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
  passwordHint: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  optionText: {
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  socialButtonsContainer: {
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  socialButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  socialIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  socialIcon: {
    color: '#1877F2',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: '#ffffff',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  termsContainer: {
    marginTop: 8,
  },
  termsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  loginText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  loginLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});