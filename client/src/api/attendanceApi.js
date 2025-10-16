import axios from "axios";
import { Platform } from "react-native";

// Use __DEV__ to toggle between development and production endpoints
const isDevelopment = __DEV__;

// In development, for Android emulator, use 10.0.2.2 to connect to your host machine's localhost.
// For iOS simulator, 'localhost' works.
const devApiHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const devApiUrl = `http://${devApiHost}:5000/api/attendance`;

// In production, this should be your deployed backend URL.
const prodApiUrl = "https://your-production-server.com/api/attendance";

const API_BASE = isDevelopment ? devApiUrl : prodApiUrl;

export const markAttendanceByVoice = async (transcript, force = false) => {
  const { data } = await axios.post(`${API_BASE}/voice`, { transcript, force });
  return data;
};

export const fetchAttendance = async () => {
  const { data } = await axios.get(API_BASE);
  return data;
};

export const queryAttendanceByVoice = async (transcript) => {
  const { data } = await axios.post(`${API_BASE}/query`, { transcript });
  return data;
};