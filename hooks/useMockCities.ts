import { useState, useEffect } from 'react';

// Types for city data
export type City = {
  id: string;
  name: string;
  country: string;
  activeUsers: number;
  distance?: number;
  imageUrl?: string;
};

export function useMockCities() {
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [popularCities, setPopularCities] = useState<City[]>([]);

  useEffect(() => {
    // Simulate API loading delay
    const timer = setTimeout(() => {
      // Mock cities data
      const mockCities: City[] = [
        {
          id: '1',
          name: 'New York',
          country: 'United States',
          activeUsers: 35420,
          distance: 12,
          imageUrl: 'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80',
        },
        {
          id: '2',
          name: 'Los Angeles',
          country: 'United States',
          activeUsers: 28750,
          distance: 28,
          imageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1932&q=80',
        },
        {
          id: '3',
          name: 'Atlanta',
          country: 'United States',
          activeUsers: 42300,
          distance: 150,
          imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80',
        },
        {
          id: '4',
          name: 'Houston',
          country: 'United States',
          activeUsers: 38200,
          distance: 220,
          imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2073&q=80',
        },
        {
          id: '5',
          name: 'Charlotte',
          country: 'United States',
          activeUsers: 46800,
          distance: 580,
          imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1988&q=80',
        }
      ];

      // Set the popular cities (for the horizontal scrolling section)
      const popular = mockCities
        .sort((a, b) => b.activeUsers - a.activeUsers)
        .slice(0, 5);

      setCities(mockCities);
      setPopularCities(popular);
      setLoading(false);
    }, 1200); // Simulate 1.2 second loading time

    return () => clearTimeout(timer);
  }, []);

  return { cities, popularCities, loading };
} 