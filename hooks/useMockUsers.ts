import { useState, useEffect } from 'react';
import { User } from '@/types/user';

// Helper functions for generating mock data
const generateRandomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/** Random distance in miles, one decimal, roughly 0.2–18 mi */
const randomDistanceMiles = () => {
  const raw = 0.2 + Math.random() * 17.8;
  return Math.round(raw * 10) / 10;
};

const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const getRandomItems = <T>(array: T[], min: number, max: number): T[] => {
  const count = generateRandomNumber(min, max);
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Constants for generating diverse user data
const MALE_NAMES = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Daniel', 'Matthew', 'Anthony', 'Christopher', 'Charles', 'Andrew', 'Paul', 'Brian', 'Mark', 'George', 'Kenneth'];
const FEMALE_NAMES = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Margaret', 'Betty', 'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna'];
const GENDER_NEUTRAL_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Avery', 'Quinn', 'Reese', 'Finley', 'River', 'Dakota', 'Skyler', 'Tatum', 'Jamie', 'Emerson', 'Rowan', 'Blair', 'Phoenix', 'Oakley'];
const GENDERS = ['Male', 'Female', 'Trans Man', 'Trans Woman', 'Non-binary', 'Gender Fluid People', 'Other'];
const LOCATIONS = ['Downtown', 'Midtown', 'Uptown', 'East Village', 'West End', 'Brooklyn', 'Greenwich', 'Tribeca', 'SoHo', 'Financial District', 'Chelsea', 'Upper East Side', 'Lower Manhattan', 'Chinatown', 'Harlem'];
const INTERESTS = ['Hiking', 'Photography', 'Travel', 'Fitness', 'Coffee', 'Food', 'Coding', 'Cooking', 'Gaming', 'Art', 'Dogs', 'Yoga', 'Writing', 'Music', 'Concerts', 'DJing', 'Meditation', 'Health', 'Marketing', 'Reading', 'Activism', 'Poetry', 'Technology', 'Entrepreneurship', 'Wellness', 'Volunteering', 'Nature', 'Cinema', 'Theatre', 'Dance', 'Singing', 'Painting', 'Cycling', 'Running', 'Swimming', 'Climbing', 'Fashion', 'Design', 'Languages', 'Science'];
const INTIMACY_ROLES = ['Top', 'Switch', 'Bottom', 'No Label', 'Still exploring'];
const RELATIONAL_GOALS = ['Casual Dating', 'Hookups', 'Serious Relationship', 'Friendship', 'Networking'];
const HIV_STATUSES = ['Negative', 'Negative on PrEP', 'Positive', 'Positive Undetectable', 'Prefer not to say'];
const SAFETY_PRACTICES = ['Always practice safe sex', 'Sometimes practice safe sex', 'Prefer not to say', 'Discuss in person'];
const LAST_ACTIVE = ['2 min ago', '5 min ago', '15 min ago', '30 min ago', '1 hour ago', '2 hours ago', '3 hours ago', 'Yesterday', 'This morning', 'Last night', 'This week'];
const ETHNICITIES = ['White', 'Black', 'Hispanic', 'Asian', 'Middle Eastern', 'Mixed', 'Pacific Islander', 'Native American', 'South Asian', 'East Asian', 'African'];

export function useMockUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Generate 100 diverse users
    const mockUsers: User[] = [];
    
    // Generate additional 88 users to reach 100 total
    for (let i = 13; i <= 100; i++) {
      const gender = getRandomItem(['Female']);
    
      // Always use feminine / neutral names
      let displayName = getRandomItem([...FEMALE_NAMES, ...GENDER_NEUTRAL_NAMES]);
    
      // Add uniqueness sometimes
      if (Math.random() > 0.7) {
        displayName += Math.floor(Math.random() * 99);
      }
    
      const age = generateRandomNumber(21, 45);
      const distance = randomDistanceMiles();
      const isOnline = Math.random() > 0.6;
    
      // Bio (same logic, just slightly cleaner tone)
      let bio: string | undefined;
      if (Math.random() > 0.1) {
        const bioTemplates = [
          `${displayName}, ${age}. Into ${getRandomItem(INTERESTS)} & ${getRandomItem(INTERESTS)}.`,
          `Looking for ${getRandomItem(RELATIONAL_GOALS).toLowerCase()}. Love ${getRandomItem(INTERESTS)}.`,
          `Based in ${getRandomItem(LOCATIONS)}. Always down for ${getRandomItem(INTERESTS)}.`,
          `${getRandomItem(['Soft energy', 'Playful', 'Chill', 'Curious'])} — let’s connect.`,
        ];
        bio = getRandomItem(bioTemplates);
      }
    
      // ALWAYS use women images
      const index = generateRandomNumber(1, 90);
      const profilePicture = `https://randomuser.me/api/portraits/women/${index}.jpg`;
    
      const user: User = {
        id: i.toString(),
        name: displayName,
        display_name: displayName,
        email: '',
        age,
        gender,
        distance,
        bio,
        profilePicture,
        locationCity: getRandomItem(LOCATIONS),
        locationState: '',
        interests: getRandomItems(INTERESTS, 1, 5),
        lastActive: getRandomItem(LAST_ACTIVE),
        isOnline,
        intimacyRole: getRandomItem(INTIMACY_ROLES),
        relationalRelationship: getRandomItem(RELATIONAL_GOALS),
        presentationTags: getRandomItems(['Femme', 'Masc', 'Stem', 'Butch'], 0, 2),
        ethnicity: getRandomItem(ETHNICITIES),
        showPreferencesPublicly: Math.random() > 0.5,
        height: generateRandomNumber(150, 185),
        bodyType: getRandomItem([
          'athletic',
          'soft',
          'curvy',
          'muscular',
          'plus-size',
          'lean',
          'prefer not to say',
        ]),
      };
    
      mockUsers.push(user);
    }
    
    setUsers(mockUsers);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, []);

  // Refresh function to reload the data
  const refresh = async () => {
    return fetchUsers();
  };

  return { users, loading, refresh };
} 