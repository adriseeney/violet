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
const SEXUAL_PREFERENCES = ['Men', 'Women', 'Everyone'];
const SEXUAL_ROLES = ['Active', 'Passive', 'Versatile', 'Not specified'];
const SEXUAL_POSITIONS = ['Giving', 'Receiving', 'Both', 'None'];
const INTIMACY_PREFERENCES = ['Casual Dating', 'Hookups', 'Serious Relationship', 'Friendship', 'Networking'];
const SEX_STYLES = ['Gentle', 'Moderate', 'Intense', 'Experimental', 'BDSM/Kink'];
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
    
    // Add existing manually crafted users (12 users)
    /*mockUsers.push(
      {
        id: "1",
        username: "Alex",
        age: 28,
        gender: "Male",
        distance: 2,
        bio: "Just moved to the city, looking to meet new people!",
        profilePicture: "https://randomuser.me/api/portraits/men/32.jpg",
        location: "Downtown",
        interests: ["Hiking", "Photography", "Travel"],
        lastActive: "2 min ago",
        isOnline: true,
        sexualPreference: "Everyone",
        sexualRole: "Versatile",
        intimacyPreferences: ["Casual Dating", "Friendship"],
      },
      {
        id: "2",
        username: "Samantha",
        age: 25,
        gender: "Female",
        distance: 5,
        bio: "Coffee addict and fitness enthusiast. Love trying new restaurants and exploring the city.",
        profilePicture: "https://randomuser.me/api/portraits/women/43.jpg",
        location: "Midtown",
        interests: ["Fitness", "Coffee", "Food"],
        lastActive: "5 min ago",
        isOnline: true,
        sexualPreference: "Men",
        intimacyPreferences: ["Serious Relationship"],
      },
      {
        id: "3",
        username: "Taylor",
        age: 30,
        gender: "Non-binary",
        distance: 7,
        bio: "Software engineer by day, chef by night. Looking for genuine connections and good conversations.",
        profilePicture: "https://randomuser.me/api/portraits/women/91.jpg",
        location: "Uptown",
        interests: ["Coding", "Cooking", "Gaming"],
        lastActive: "15 min ago",
        isOnline: false,
        sexualPreference: "Everyone",
        intimacyPreferences: ["Friendship", "Networking"],
      },
      {
        id: "4",
        username: "Morgan",
        age: 26,
        gender: "Male",
        distance: 10,
        bio: "Art lover and dog parent. Always up for adventure and trying new things!",
        profilePicture: "https://randomuser.me/api/portraits/men/57.jpg",
        location: "East Village",
        interests: ["Art", "Dogs", "Yoga"],
        lastActive: "30 min ago",
        isOnline: false,
        sexualPreference: "Men",
        sexualRole: "Active",
        intimacyPreferences: ["Casual Dating", "Hookups"],
      },
      {
        id: "5",
        username: "Emily",
        age: 29,
        gender: "Female",
        distance: 3,
        bio: "Journalist who loves to travel. Looking for someone to explore with and share adventures.",
        profilePicture: "https://randomuser.me/api/portraits/women/64.jpg",
        location: "West End",
        interests: ["Travel", "Writing", "Photography"],
        lastActive: "1 hour ago",
        isOnline: true,
        sexualPreference: "Everyone",
        intimacyPreferences: ["Casual Dating", "Serious Relationship"],
      },
      {
        id: "6",
        username: "Jamie",
        age: 31,
        gender: "Trans Woman",
        distance: 15,
        bio: "Music producer and concert lover. Can talk about music all day long!",
        profilePicture: "https://randomuser.me/api/portraits/women/22.jpg",
        location: "Brooklyn",
        interests: ["Music", "Concerts", "DJing"],
        lastActive: "2 hours ago",
        isOnline: false,
        sexualPreference: "Everyone",
        sexualRole: "Versatile",
        intimacyPreferences: ["Friendship", "Serious Relationship"],
      },
      {
        id: "7",
        username: "Jessica",
        age: 27,
        gender: "Female",
        distance: 8,
        bio: "Yoga instructor and wellness enthusiast. Looking for positive connections and mindful people.",
        profilePicture: "https://randomuser.me/api/portraits/women/33.jpg",
        location: "Greenwich",
        interests: ["Yoga", "Meditation", "Health"],
        lastActive: "3 hours ago",
        isOnline: true,
        sexualPreference: "Men",
        intimacyPreferences: ["Serious Relationship"],
      },
      {
        id: "8",
        username: "Michael",
        age: 32,
        gender: "Male",
        distance: 6,
        bio: "Marketing professional who enjoys hiking and outdoor activities on weekends.",
        profilePicture: "https://randomuser.me/api/portraits/men/76.jpg",
        location: "Tribeca",
        interests: ["Hiking", "Marketing", "Reading"],
        lastActive: "4 hours ago",
        isOnline: false,
        sexualPreference: "Men",
        intimacyPreferences: ["Casual Dating"],
      },
      {
        id: "9",
        username: "Jordan",
        age: 29,
        gender: "Gender Fluid People",
        distance: 12,
        bio: "Artist and activist. Passionate about creative expression and community building.",
        profilePicture: "https://randomuser.me/api/portraits/women/85.jpg",
        location: "SoHo",
        interests: ["Art", "Activism", "Poetry"],
        lastActive: "1 hour ago",
        isOnline: true,
        sexualPreference: "Everyone",
        intimacyPreferences: ["Friendship", "Casual Dating", "Networking"],
      },
      {
        id: "10",
        username: "Nadia",
        age: 34,
        gender: "Trans Woman",
        distance: 9,
        bio: "Tech entrepreneur and foodie. Love discovering new restaurants and connecting with interesting people.",
        profilePicture: "https://randomuser.me/api/portraits/women/29.jpg",
        location: "Financial District",
        interests: ["Technology", "Food", "Entrepreneurship"],
        lastActive: "5 hours ago",
        isOnline: false,
        sexualPreference: "Everyone",
        intimacyPreferences: ["Networking", "Friendship"],
      },
      {
        id: "11",
        username: "Riley",
        age: 26,
        gender: "Trans Man",
        distance: 14,
        bio: "Fitness trainer and health coach. Believe in the power of wellness and positive mindset.",
        profilePicture: "https://randomuser.me/api/portraits/men/40.jpg",
        location: "Chelsea",
        interests: ["Fitness", "Wellness", "Coaching"],
        lastActive: "30 min ago",
        isOnline: true,
        sexualPreference: "Women",
        intimacyPreferences: ["Serious Relationship"],
      },
      {
        id: "12",
        username: "Olivia",
        age: 30,
        gender: "Female",
        distance: 7,
        bio: "Veterinarian and animal lover. Spend my free time volunteering at local animal shelters.",
        profilePicture: "https://randomuser.me/api/portraits/women/71.jpg",
        location: "Upper East Side",
        interests: ["Animals", "Volunteering", "Nature"],
        lastActive: "20 min ago",
        isOnline: true,
        sexualPreference: "Men",
        intimacyPreferences: ["Casual Dating", "Serious Relationship"],
      }
    );
    */
    
    // Generate additional 88 users to reach 100 total
    for (let i = 13; i <= 100; i++) {
      const gender = getRandomItem(['Female']);
    
      // Always use feminine / neutral names
      let username = getRandomItem([...FEMALE_NAMES, ...GENDER_NEUTRAL_NAMES]);
    
      // Add uniqueness sometimes
      if (Math.random() > 0.7) {
        username += Math.floor(Math.random() * 99);
      }
    
      const age = generateRandomNumber(21, 45);
      const distance = randomDistanceMiles();
      const isOnline = Math.random() > 0.6;
    
      // Bio (same logic, just slightly cleaner tone)
      let bio: string | undefined;
      if (Math.random() > 0.1) {
        const bioTemplates = [
          `${username}, ${age}. Into ${getRandomItem(INTERESTS)} & ${getRandomItem(INTERESTS)}.`,
          `Looking for ${getRandomItem(INTIMACY_PREFERENCES).toLowerCase()}. Love ${getRandomItem(INTERESTS)}.`,
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
        username,
        age,
        gender,
        distance,
        bio,
        profilePicture,
        location: getRandomItem(LOCATIONS),
        interests: getRandomItems(INTERESTS, 1, 5),
        lastActive: getRandomItem(LAST_ACTIVE),
        isOnline,
        sexualPreference: 'Women', // 
        sexualRole: getRandomItem(SEXUAL_ROLES),
        intimacyPreferences: getRandomItems(INTIMACY_PREFERENCES, 1, 3),
        sexStyle: getRandomItem(SEX_STYLES),
        hivStatus: getRandomItem(HIV_STATUSES),
        safetyPractices: getRandomItem(SAFETY_PRACTICES),
        ethnicity: getRandomItem(ETHNICITIES),
        showPreferencesPublicly: Math.random() > 0.5,
        height: generateRandomNumber(150, 185),
        weight: generateRandomNumber(50, 90),
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