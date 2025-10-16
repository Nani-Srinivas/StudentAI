Project Documentation: Student Attendance AI

This document provides a detailed overview of the Student Attendance AI project, including its structure, backend and frontend implementation, and instructions on how to run the application.

1. Project Overview

The Student Attendance AI is a mobile application that allows teachers to mark and query student attendance using voice commands. The application consists of a React Native mobile client and a Node.js backend server.

Key Features:

Voice-based attendance marking: Teachers can use natural language commands to mark students as present or absent.

Voice-based attendance querying: Teachers can ask questions in natural language to get attendance information.

Attendance history: The application displays a list of past attendance records.

2. Project Structure

The project is a monorepo with two main directories:

student-attendance-ai/
├── client/         # React Native application
├── server/         # Node.js backend
├── .gitignore
└── GEMINI.md       # This documentation file

3. Backend (Server)

The backend is a Node.js application built with Express.js. It is responsible for handling API requests, interacting with the database, and integrating with the OpenAI API for natural language processing.

3.1. Technologies

Node.js: JavaScript runtime environment

Express.js: Web framework for Node.js

MongoDB: NoSQL database for storing attendance records

Mongoose: ODM library for MongoDB

OpenAI API: Used for natural language processing of voice commands

dotenv: For managing environment variables

cors: For enabling Cross-Origin Resource Sharing

3.2. Environment Variables

The server requires the following environment variables, which should be placed in a .env file in the server/ directory. A .env.example file is provided as a template.

MONGO_URI: The connection string for the MongoDB database

OPENAI_API_KEY: Your API key for the OpenAI API

PORT: The port on which the server will run (defaults to 5000)

3.3. API Endpoints

The server exposes the following API endpoints under the base path /api/attendance:

POST /voice — Marks attendance based on a voice command.

Request body: { "transcript": "<voice_command>" }

Response: A success message and the created attendance record.

GET / — Retrieves all attendance records.

Response: An array of attendance records.

GET /report — Generates a summary report of attendance.

Response: A summary object with the number of absentees for each class.

POST /query — Queries attendance records based on a natural language query.

Request body: { "transcript": "<natural_language_query>" }

Response: The result of the query, which can be a list of present students, absent students, or full attendance records.

3.4. Database

The application uses MongoDB to store attendance records. The database schema is defined in server/models/Attendance.js using Mongoose.

The Attendance schema is defined with the following fields:

- `className` (String, required): The name of the class (e.g., "10A").
- `date` (Date): The date of the attendance record, defaulting to the current time.
- `students` (Array): A list of student objects, where each object contains:
  - `name` (String): The name of the student.
  - `status` (String): The attendance status, which must be either "present" or "absent".

Additionally, the schema defines two virtual fields that are automatically generated and available for querying:

- `absentStudents`: An array of student objects for all students marked as "absent".
- `presentStudents`: An array of student objects for all students marked as "present".

3.5. AI Integration

The server uses the OpenAI API to parse natural language commands and queries. The utility functions for this are located in server/utils/openai.js.

parseAttendanceCommand(transcript) — Takes a voice command for marking attendance and converts it into a structured JSON object to create an attendance record.

parseAttendanceQuery(transcript) — Takes a natural language query about attendance and converts it into a structured JSON object to query the database.

4. Frontend (Client)

The frontend is a React Native application that provides the user interface for the application.

4.1. Technologies

React Native: Framework for building native mobile apps with React

React Native Paper: A cross-platform UI component library

axios: For making HTTP requests to the backend server

@ascendtis/react-native-voice-to-text: For voice recognition

4.2. Components

The main UI of the application is in client/src/screens/HomeScreen.js. This component is responsible for:

Displaying the list of attendance records

Handling user input (both text and voice)

Displaying query results

Providing sample commands through a Floating Action Button (FAB)

4.3. API Integration

The client communicates with the server using the API functions defined in client/src/api/attendanceApi.js.
This file contains functions for fetching attendance records, marking attendance, and querying attendance.

4.4. Voice Recognition

The application uses the @ascendtis/react-native-voice-to-text library for voice recognition.
The HomeScreen component sets up event listeners to handle the results of the voice recognition.

5. How to Run the Project
5.1. Server

Navigate to the server/ directory

Install dependencies:

npm install


Create a .env file and add the required environment variables (see section 3.2)

Start the server:

npm run dev


The server will run on the port specified in your .env file (or 5000 by default).

5.2. Client

Navigate to the client/ directory

Install dependencies:

npm install


Start the Metro bundler:

npm start


Run the application on your desired platform:

For Android: npm run android

For iOS: npm run ios

Make sure you have a device or emulator running and your React Native environment is set up correctly.