import axios from "axios";
// const API_BASE = "http://localhost:5000/api/attendance";
const API_BASE = "http://192.168.1.32:5000/api/attendance";

export const markAttendanceByVoice = async (transcript) => {
  const { data } = await axios.post(`${API_BASE}/voice`, { transcript });
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