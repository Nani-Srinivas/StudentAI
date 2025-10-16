
import React, { useState, useEffect } from "react";
import { View, FlatList, Text, StyleSheet, TextInput, PermissionsAndroid, Platform, ActivityIndicator, TouchableOpacity } from "react-native";
import { Button, Card, IconButton, FAB } from "react-native-paper";
import { startListening, stopListening, addEventListener } from "@ascendtis/react-native-voice-to-text";
import { fetchAttendance, markAttendanceByVoice, queryAttendanceByVoice } from "../api/attendanceApi";

const sampleCommands = [
  "Mark all present in Class 10A.",
  "Mark Ramesh and Priya absent in Class 7B.",
  "Who was absent in Class 9 yesterday?",
  "Who was present in Class 10A on October 16 2025?",
];

export default function HomeScreen() {
  const [records, setRecords] = useState([]);
  const [command, setCommand] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    loadAttendance();

    const onSpeechStart = addEventListener("onSpeechStart", () => setIsListening(true));
    const onSpeechEnd = addEventListener("onSpeechEnd", () => setIsListening(false));
    const onSpeechResults = addEventListener("onSpeechResults", (e) => {
      if (e?.value && e.value.length > 0) {
        setCommand(e.value[0]);
        setIsListening(false);
      }
    });
    const onSpeechPartialResults = addEventListener("onSpeechPartialResults", (e) => {
      if (e?.value && e.value.length > 0) setCommand(e.value[0]);
    });
    const onSpeechError = addEventListener("onSpeechError", (e) => {
      console.warn("Speech error", e);
      setIsListening(false);
      setResponseMsg(e.message || "Speech recognition error");
    });

    return () => {
      onSpeechStart.remove();
      onSpeechEnd.remove();
      onSpeechResults.remove();
      onSpeechPartialResults.remove();
      onSpeechError.remove();
    };
  }, []);

  const loadAttendance = () => {
    fetchAttendance().then(setRecords).catch(err => console.error("Error fetching attendance:", err));
  };

  async function requestMicrophonePermission() {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
        title: "Microphone Permission",
        message: "We need access to your microphone to capture attendance commands.",
        buttonPositive: "OK",
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn("Permission error", err);
      return false;
    }
  }

  const toggleListening = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setResponseMsg("Microphone permission is required.");
      return;
    }
    try {
      if (isListening) {
        await stopListening();
        setIsListening(false);
      } else {
        setCommand("");
        setResponseMsg("");
        await startListening();
        setIsListening(true);
      }
    } catch (err) {
      console.error("Voice toggle error:", err);
      setIsListening(false);
    }
  };

  const handleSubmit = async () => {
    if (!command) return;
    setLoading(true);
    setResponseMsg("");
    try {
      const res = await markAttendanceByVoice(command);
      setResponseMsg(res?.message || "No response from server");
      setCommand("");
      loadAttendance(); // Refresh list
    } catch (err) {
      console.error(err);
      setResponseMsg(err?.response?.data?.message || "Error sending command");
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!command) return;
    setLoading(true);
    setResponseMsg("");
    setQueryResult(null);
    try {
      const res = await queryAttendanceByVoice(command);
      setResponseMsg(res?.message || "No response from server");
      setQueryResult(res?.data);
      setCommand("");
    } catch (err) {
      console.error(err);
      setResponseMsg(err?.response?.data?.message || "Error sending query");
    } finally {
      setLoading(false);
    }
  };

  const fabActions = sampleCommands.map(cmd => ({
    icon: 'alpha-c-box-outline',
    label: cmd,
    onPress: () => setCommand(cmd),
  }));

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title title={`Class ${item.className}`} subtitle={new Date(item.date).toDateString()} />
            <Card.Content>
              <Text>Absent: {(item.absentStudents && item.absentStudents.map(s => s.name).join(", ")) || "None"}</Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text>No attendance records yet.</Text></View>}
        contentContainerStyle={{ flexGrow: 1 }}
      />

      {queryResult && (
        <Card style={styles.card}>
          <Card.Title title="Query Result" />
          <Card.Content>
            {queryResult.presentStudents && <Text>Present: {queryResult.presentStudents.map(s => s.name).join(", ") || "None"}</Text>}
            {queryResult.absentStudents && <Text>Absent: {queryResult.absentStudents.map(s => s.name).join(", ") || "None"}</Text>}
            {queryResult.records && <Text>Records: {JSON.stringify(queryResult.records, null, 2)}</Text>}
          </Card.Content>
        </Card>
      )}

      <FAB.Group
        open={fabOpen}
        icon={fabOpen ? 'close' : 'help-circle-outline'}
        actions={fabActions}
        onStateChange={({ open }) => setFabOpen(open)}
        style={styles.fab}
      />

      <View style={styles.commandBar}>
        <TextInput
          style={styles.input}
          placeholder="Type or speak your command..."
          value={command}
          onChangeText={setCommand}
        />
        <IconButton
          icon={isListening ? "microphone-off" : "microphone"}
          onPress={toggleListening}
          color="#6200ee"
          size={28}
        />
        <Button mode="contained" onPress={handleSubmit} disabled={!command || loading}>
          Submit
        </Button>
        <Button mode="contained" onPress={handleQuery} disabled={!command || loading}>
          Query
        </Button>
      </View>

      {loading && <ActivityIndicator style={styles.status} />}
      {responseMsg ? <Text style={styles.status}>{responseMsg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7fb" },
  card: { marginVertical: 8, marginHorizontal: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
  },
  commandBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: "#f7f7fb",
  },
  status: {
    padding: 12,
    textAlign: 'center',
    color: 'green',
    fontWeight: '600'
  }
});
