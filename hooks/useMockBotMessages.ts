import { useState, useEffect, useCallback } from 'react';
import { useMockUsers } from './useMockUsers';
import { useMockChats } from './useMockChats';
import { useMockChatMessages } from './useMockChatMessages';
import { Message } from '@/types/message';
import { Chat } from '@/types/chat';
import { User } from '@/types/user';
import { formatDistanceMiles } from '@/utils/formatDistance';

// Helper functions
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const generateRandomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Message templates for different scenarios
const GREETING_MESSAGES = [
  "Hey there! How are you doing?",
  "Hi! I noticed your profile and thought I'd say hello.",
  "Hello! How's your day going?",
  "Hey, I like your profile! Want to chat?",
  "Hi there, you seem interesting. How are you?",
  "Hey! What's up?",
  "Hello from the other side of the app! 👋",
  "Hi, I'm new here. Nice to meet you!",
  "Hey! How's your week going?",
  "Hello! Thought I'd reach out and connect."
];

const WELCOME_MESSAGES = [
  "Welcome to the app! How are you liking it so far?",
  "Hey there! Just checking in to see how your experience has been after signing up. Finding any interesting matches?",
  "Hope you're enjoying the app! Wanted to remind you to complete your profile to get more matches.",
  "Hi there! Thanks for joining our community. We've seen many people with similar interests to yours. Have you explored the Discover tab yet?",
  "Welcome aboard! Let me know if you need any help navigating the app."
];

// Use API to get responses
const getApiResponse = async (prompt: string, context: string = ""): Promise<string> => {
  try {
    // Using free Hugging Face Inference API for text generation
    // Create an AbortController with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          past_user_inputs: context ? [context] : [],
          generated_responses: [],
          text: prompt
        },
      }),
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('API response error');
    }

    const data = await response.json();
    // Return the generated response text or a fallback
    return data.generated_text || getRandomItem(RESPONSE_MESSAGES).replace("{interest}", "chatting");
  } catch (error) {
    console.log('Error fetching API response, using fallback', error);
    // Fallback to templates if API fails
    return getFallbackResponse(prompt);
  }
};

// Get a fallback response if API fails
const getFallbackResponse = (userMessage: string): string => {
  // Use simple keyword matching for fallback responses
  const userMessageLower = userMessage.toLowerCase();
  
  if (userMessageLower.includes("hello") || userMessageLower.includes("hi") || userMessageLower.includes("hey")) {
    return getRandomItem(RESPONSE_MESSAGES).replace("{interest}", "chatting");
  }
  
  if (userMessageLower.includes("how are you")) {
    return "I'm doing great! Thanks for asking. How about you?";
  }
  
  if (userMessageLower.includes("name")) {
    return "My name is a secret, but you can call me whatever you like!";
  }
  
  if (userMessageLower.includes("age")) {
    return "I don't really count my age, but I'm definitely young at heart!";
  }
  
  if (userMessageLower.includes("date") || userMessageLower.includes("meet")) {
    return "I'd love to get to know you better first. What do you enjoy doing?";
  }
  
  // If no matches, return a generic response
  return getRandomItem([
    "That's interesting! Tell me more.",
    "I'd love to hear more about that.",
    "Really? That sounds great!",
    "Cool! What else is on your mind?",
    "Interesting perspective. What makes you think that?",
    "I see! And how does that make you feel?",
    "That's great to know. What else are you into?"
  ]);
};

const FOLLOW_UP_MESSAGES = [
  "So, what do you like to do for fun?",
  "What brings you to this app?",
  "I noticed you're into {interest}. How long have you been doing that?",
  "Have you been to any good {interest} spots around here?",
  "I'm really into {interest} too! Any recommendations?",
  "How long have you lived in {location}?",
  "What's your favorite thing about {location}?",
  "I see you're {distance} away. Do you know any good spots in that area?",
  "Would you like to get together sometime for {interest}?",
  "How's your experience been on this app so far?"
];

const RESPONSE_MESSAGES = [
  "I'm doing pretty well, thanks for asking! How about you?",
  "I'm good! Just been busy with {interest} lately.",
  "Hey! I'm great. Just got back from a {interest} session.",
  "I'm okay, thanks! What have you been up to?",
  "Doing well, thanks for reaching out! What's new with you?",
  "Pretty good! Looking forward to the weekend. Any plans?",
  "I'm good, just chilling. What about you?",
  "Hi there! I'm well. How's your day been?",
  "I'm doing fine, thanks for asking! How's everything with you?",
  "Not bad! Just relaxing after a long day. How are you?"
];

const CONVERSATION_STARTERS = [
  "So, what do you think about {topic}?",
  "Have you ever tried {activity}?",
  "If you could travel anywhere right now, where would you go?",
  "What's the best movie or show you've seen recently?",
  "What's your favorite place to eat around here?",
  "What's keeping you busy these days?",
  "Do you have any recommendations for {interest} in this area?",
  "What's something you're looking forward to this year?",
  "What's your idea of a perfect date?",
  "What made you want to connect on this app?"
];

const TOPICS = [
  "the local dating scene",
  "this heat wave",
  "the latest movies",
  "that new restaurant downtown",
  "the upcoming festival",
  "the dating app experience",
  "online dating",
  "the best coffee shops in town",
  "weekend activities",
  "meeting new people"
];

const ACTIVITIES = [
  "rock climbing",
  "salsa dancing",
  "meditation",
  "cooking classes",
  "pottery",
  "stand-up comedy",
  "escape rooms",
  "karaoke",
  "painting classes",
  "food tours"
];

export function useMockBotMessages() {
  const { users } = useMockUsers();
  const { chats, addChat, updateLastMessage } = useMockChats();
  const { messages, addMessage } = useMockChatMessages();
  const [botActive, setBotActive] = useState(false);
  const [messageQueue, setMessageQueue] = useState<{
    chatId: string;
    senderId: string;
    receiverId: string;
    content: string;
    delay: number;
  }[]>([]);
  const [newUserTimers, setNewUserTimers] = useState<{[userId: string]: NodeJS.Timeout}>({});

  // Start bot messaging
  const startBotMessaging = () => {
    if (users.length < 10) return; // Ensure we have enough users
    setBotActive(true);
  };

  // Stop bot messaging
  const stopBotMessaging = () => {
    setBotActive(false);
    setMessageQueue([]);
    
    // Clear all new user timers
    Object.values(newUserTimers).forEach(timer => clearTimeout(timer));
    setNewUserTimers({});
  };

  // Schedule message to new user after signup
  const scheduleWelcomeMessage = (userId: string) => {
    // Find system users to send message from (excluding user 1 which is the current user)
    const systemUsers = users.filter(u => u.id !== '1' && u.id !== userId && parseInt(u.id) < 20);
    
    if (systemUsers.length === 0) return;
    
    // Pick a random system user to send the welcome message
    const systemUser = getRandomItem(systemUsers);
    
    // Create a chat between system user and new user
    const chatId = `chat_welcome_${Date.now()}`;
    const newChat: Chat = {
      id: chatId,
      participants: [userId, systemUser.id],
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      username: systemUser.display_name || systemUser.name,
      profileImage: systemUser.profilePicture,
      isOnline: true
    };
    
    // Schedule welcome message after 15 minutes (900000ms)
    // Using 30 seconds (30000ms) for demo purposes
    const timer = setTimeout(() => {
      // Add chat
      addChat(newChat);
      
      // Send welcome message
      const welcomeMessage = getRandomItem(WELCOME_MESSAGES);
      
      const message: Message = {
        id: `msg_welcome_${Date.now()}`,
        chatId,
        senderId: systemUser.id,
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      addMessage(message);
      updateLastMessage(chatId, welcomeMessage, new Date().toISOString(), 1);
      
      // Remove timer from state
      setNewUserTimers(prev => {
        const newTimers = {...prev};
        delete newTimers[userId];
        return newTimers;
      });
    }, 30000); // 30 seconds for demo
    
    // Save timer reference
    setNewUserTimers(prev => ({
      ...prev,
      [userId]: timer
    }));
  };

  // Create a new chat between two users
  const createRandomChat = () => {
    if (users.length < 2) return null;

    // Pick two random users
    const userPool = [...users];
    const userIndex1 = Math.floor(Math.random() * userPool.length);
    const user1 = userPool[userIndex1];
    
    // Remove first user from pool
    userPool.splice(userIndex1, 1);
    
    // Pick second user
    const userIndex2 = Math.floor(Math.random() * userPool.length);
    const user2 = userPool[userIndex2];

    // Check if chat already exists
    const existingChat = chats.find(chat => 
      (chat.participants.includes(user1.id) && chat.participants.includes(user2.id))
    );

    if (existingChat) {
      return existingChat;
    }

    // Create new chat
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      participants: [user1.id, user2.id],
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0
    };

    addChat(newChat);
    return newChat;
  };

  // Generate an initial message
  const generateInitialMessage = (senderId: string, receiverId: string) => {
    const sender = users.find(u => u.id === senderId);
    const receiver = users.find(u => u.id === receiverId);
    
    if (!sender || !receiver) return "";
    
    // Get a random greeting
    let message = getRandomItem(GREETING_MESSAGES);
    
    return message;
  };

  // Generate a follow-up message
  const generateFollowUpMessage = async (senderId: string, receiverId: string, chatId: string) => {
    const sender = users.find(u => u.id === senderId);
    const receiver = users.find(u => u.id === receiverId);
    
    if (!sender || !receiver) return "";
    
    // Check chat history
    const chatMessages = messages.filter(m => m.chatId === chatId);
    
    let message = "";
    
    if (chatMessages.length === 0) {
      // First message
      message = generateInitialMessage(senderId, receiverId);
    } else if (chatMessages.length === 1) {
      // Response to greeting
      message = getRandomItem(RESPONSE_MESSAGES);
      
      if (receiver.interests && receiver.interests.length > 0) {
        const interest = getRandomItem(receiver.interests);
        message = message.replace("{interest}", interest.toLowerCase());
      }
    } else {
      // For messages beyond the initial exchange, use API if possible
      const lastMessage = chatMessages[chatMessages.length - 1];
      const previousMessage = chatMessages.length > 1 ? chatMessages[chatMessages.length - 2] : null;
      
      // Get context for the AI
      const context = previousMessage ? previousMessage.content : "";
      
      try {
        // Use API for more dynamic responses
        message = await getApiResponse(lastMessage.content, context);
      } catch (error) {
        console.log('Error generating response, using fallback', error);
        
        // Fallback to template responses
        if (chatMessages.length === 2) {
          message = getRandomItem(FOLLOW_UP_MESSAGES);
          
          if (receiver.interests && receiver.interests.length > 0) {
            const interest = getRandomItem(receiver.interests);
            message = message.replace("{interest}", interest.toLowerCase());
          }
          
          const receiverLocation = [receiver.locationCity, receiver.locationState]
            .filter(Boolean)
            .join(', ');
          if (receiverLocation) {
            message = message.replace("{location}", receiverLocation);
          }
          
          message = message.replace(
            "{distance}",
            formatDistanceMiles(receiver.distance)
          );
        } else {
          message = getFallbackResponse(lastMessage.content);
        }
      }
    }
    
    return message;
  };

  // Queue up a new message
  const queueMessage = async (chatId: string, senderId: string, receiverId: string) => {
    const content = await generateFollowUpMessage(senderId, receiverId, chatId);
    const delay = generateRandomNumber(3000, 10000); // 3-10 seconds
    
    setMessageQueue(prevQueue => [
      ...prevQueue,
      { chatId, senderId, receiverId, content, delay }
    ]);
  };

  // Process the message queue
  useEffect(() => {
    if (!botActive || messageQueue.length === 0) return;
    
    const { chatId, senderId, receiverId, content, delay } = messageQueue[0];
    
    const timer = setTimeout(() => {
      // Add message
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        chatId,
        senderId,
        content,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      addMessage(newMessage);
      
      // Update chat's last message
      updateLastMessage(chatId, content, new Date().toISOString(), senderId !== "1" ? 1 : 0);
      
      // Remove from queue
      setMessageQueue(prevQueue => prevQueue.slice(1));
      
      // 50% chance to get a reply
      if (Math.random() > 0.5) {
        // Queue a reply (swap sender and receiver)
        queueMessage(chatId, receiverId, senderId);
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [botActive, messageQueue, users, chats, messages]);

  // Periodically generate new chats and messages
  useEffect(() => {
    if (!botActive) return;
    
    // Create new chats
    const intervalId = setInterval(() => {
      // 20% chance to create a new chat
      if (Math.random() < 0.2) {
        const newChat = createRandomChat();
        
        if (newChat) {
          // Queue initial message
          const [user1Id, user2Id] = newChat.participants;
          queueMessage(newChat.id, user1Id, user2Id);
        }
      } else if (chats.length > 0 && messageQueue.length < 5) {
        // 20% chance to add a new message to an existing chat
        if (Math.random() < 0.2) {
          // Pick a random chat
          const randomChat = getRandomItem(chats);
          const [user1Id, user2Id] = randomChat.participants;
          
          // Randomly pick sender and receiver
          const senderId = Math.random() > 0.5 ? user1Id : user2Id;
          const receiverId = senderId === user1Id ? user2Id : user1Id;
          
          queueMessage(randomChat.id, senderId, receiverId);
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [botActive, users, chats]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(newUserTimers).forEach(timer => clearTimeout(timer));
    };
  }, [newUserTimers]);

  return { 
    botActive, 
    startBotMessaging, 
    stopBotMessaging,
    scheduleWelcomeMessage,
    messageQueue: messageQueue.length 
  };
} 