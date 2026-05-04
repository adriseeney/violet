import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Users } from 'lucide-react-native';
import { useMockCities } from '@/hooks/useMockCities';
import { SearchBar } from '@/components/SearchBar';
import { router } from 'expo-router';

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { cities, popularCities, loading } = useMockCities();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = searchQuery.trim() === ''
    ? []
    : cities.filter(city => 
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.country.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);

  const handleCityPress = (cityName: string) => {
    // In a real app, this would navigate to a city-specific browse screen
    router.push({
      pathname: '/(tabs)/',
      params: { city: cityName }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Explore</Text>
        </View>
        
        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search cities"
        />
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {searchQuery.trim() !== '' && filteredCities.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Search Results
                </Text>
                {filteredCities.map(city => (
                  <Pressable 
                    key={city.id} 
                    style={[styles.cityItem, { backgroundColor: colors.cardBackground }]}
                    onPress={() => handleCityPress(city.name)}
                  >
                    <View style={styles.cityInfo}>
                      <Text style={[styles.cityName, { color: colors.text }]}>
                        {city.name}
                      </Text>
                      <Text style={[styles.countryName, { color: colors.textSecondary }]}>
                        {city.country}
                      </Text>
                    </View>
                    <View style={styles.cityMeta}>
                      <View style={styles.usersContainer}>
                        <Users size={16} color={colors.textSecondary} />
                        <Text style={[styles.userCount, { color: colors.textSecondary }]}>
                          {city.activeUsers.toLocaleString()}
                        </Text>
                      </View>
                      <MapPin size={20} color={colors.primary} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Popular Cities
              </Text>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularCitiesContent}
              >
                {popularCities.map(city => (
                  <Pressable 
                    key={city.id}
                    style={styles.popularCityCard}
                    onPress={() => handleCityPress(city.name)}
                  >
                    <Image 
                      source={{ uri: city.imageUrl }}
                      style={styles.cityImage}
                    />
                    <View style={styles.cityOverlay}>
                      <Text style={styles.popularCityName}>{city.name}</Text>
                      <View style={styles.popularCityUsers}>
                        <Users size={12} color="#ffffff" />
                        <Text style={styles.popularCityUserCount}>
                          {city.activeUsers.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Nearby Cities
              </Text>
              {cities.slice(0, 5).map(city => (
                <Pressable 
                  key={city.id} 
                  style={[styles.cityItem, { backgroundColor: colors.cardBackground }]}
                  onPress={() => handleCityPress(city.name)}
                >
                  <View style={styles.cityInfo}>
                    <Text style={[styles.cityName, { color: colors.text }]}>
                      {city.name}
                    </Text>
                    <Text style={[styles.countryName, { color: colors.textSecondary }]}>
                      {city.country}
                    </Text>
                  </View>
                  <View style={styles.cityMeta}>
                    <View style={styles.usersContainer}>
                      <Users size={16} color={colors.textSecondary} />
                      <Text style={[styles.userCount, { color: colors.textSecondary }]}>
                        {city.activeUsers.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.distance}>
                      <Text style={[styles.distanceText, { color: colors.primary }]}>
                        {city.distance} km
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  countryName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  cityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  usersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  distance: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  popularCitiesContent: {
    paddingRight: 16,
  },
  popularCityCard: {
    width: 200,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  popularCityName: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  popularCityUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularCityUserCount: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});