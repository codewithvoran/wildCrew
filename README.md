# WildCrew

> **Connect, Explore, and Conquer the Outdoors Together.**

WildCrew is a full-stack web application designed for outdoor enthusiasts, group leaders, and trip planners. It brings people together for outdoor activities like hiking, camping, kayaking, trail running, and nature walks—featuring real-time headcount management, interactive route mapping, and live weather updates.

---

## Author & Project Info

- **Author:** Voranzov Lenin Robinson
- **Project:** Capstone Project — WildCrew
- **Academic Program:** Web Development

---

## Table of Contents

- [Overview](#-overview)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [User Roles & Permissions](#-user-roles--permissions)
- [Features](#-features)
- [User Stories](#-user-stories)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Architecture](#-project-architecture)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

## Overview

### The Problem

Organizing group outdoor activities often involves fragmented communication across social media groups, messaging apps, and manual headcounts. Weather changes and location coordination add extra layers of complexity and risk.

### The Solution

**WildCrew** consolidates everything outdoor group leaders and members need into a single platform:

- **Event Management & Headcount Control:** Hosts can set strict headcount limits and review attendee requests to keep trips safe and manageable.
- **Interactive Mapping:** Trailhead markers and interactive route maps powered by Mapbox.
- **Real-Time Weather Integration:** Live weather forecasts rendered directly on event details pages for trip dates.
- **Post-Trip Community Engagement:** Member reviews, ratings, and photo sharing.

---

## Tech Stack

### Frontend

- **Framework:** [React.js](https://reactjs.org/)
- **Styling:** [Bootstrap 5](https://getbootstrap.com/) & CSS3

### Backend & Database (Firebase)

- **Authentication:** Firebase Auth (Email/Password & Session Management)
- **Database:** Cloud Firestore (Real-time NoSQL data store)
- **Storage:** Firebase Storage (User avatars and event trip photos)

### External APIs

- **Maps & Geolocation:** [Mapbox GL API](https://www.mapbox.com/) / [OpenStreetMap](https://www.openstreetmap.org/)
- **Live Forecasts:** [OpenWeatherMap API](https://openweathermap.org/api)

---

## User Roles & Permissions

| Role                       | Access Level  | Key Capabilities                                                                                                                      |
| :------------------------- | :-----------: | :------------------------------------------------------------------------------------------------------------------------------------ |
| **Guest / Visitor**        |    Public     | Browse upcoming public events, view interactive maps, read event descriptions, and access public profiles.                            |
| **Member**                 | Authenticated | Request to join events, track join request status, save favorite trips, rate/review completed trips, and upload outing photos.        |
| **Event Organizer / Host** | Authenticated | Create, edit, and soft/hard delete event listings, manage join requests (approve/reject), view attendee lists, and post trip updates. |
| **Administrator**          |     Admin     | Moderation dashboard, manage user accounts, review reported content, and uphold platform guidelines.                                  |

---

## Features

### Core Capabilities (Must-Have)

- **Secure Authentication:** User registration, login, logout, and password recovery via Firebase Auth.
- **Event Lifecycle Management:** Full CRUD functionality for events (Title, Description, Activity Type, Coordinates, Difficulty, Max Headcount).
- **Join Request System:** Interactive host approval workflow; headcount auto-decrements/increments as requests are accepted or canceled.
- **Dynamic Search & Filtering:** Filter events seamlessly by activity type (_hiking, camping, paddling, running_), difficulty tier, location, or date.
- **Role-Based Route Protection:** Client-side and database-level security rules ensuring strict permission boundaries.

### Enhanced Experience (Should-Have)

- **Interactive Maps:** Mapbox integration displaying start points, trailheads, and custom route pins.
- **Live Weather Updates:** Weather predictions for the target event date and location.
- **Reviews & Ratings:** Star-rating system and community trip reports post-event.
- **Photo Uploads:** Firebase Storage integration for user event galleries.

---

## User Stories

- **As a Guest / Visitor**, I want to view upcoming events and maps without logging in, so I can explore the platform before committing to an account.
- **As a Member**, I want to submit a request to join a hiking event and track my request status, so I can participate in organized group trips safely.
- **As an Event Organizer**, I want to establish maximum headcount limits and manually review applicants, so I can keep group sizes safe and manageable for trail capacity.
- **As an Administrator**, I want tools to manage reported content and user accounts, so I can maintain a safe, respectful environment for all outdoor enthusiasts.

---

## Getting Started

Follow these instructions to set up WildCrew locally on your machine for development and testing.

### Prerequisites

- [Node.js](https://nodejs.org/) (`v16.x` or higher recommended)
- `npm` or `yarn` package manager
- A active [Firebase Project](https://console.firebase.google.com/)
- Mapbox and OpenWeatherMap API keys

---

### Installation Setup

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/voranzovv/wildcrew.git](https://github.com/voranzovv/wildcrew.git)
   cd wildcrew
   ```
# wildCrew
# wildCrew
