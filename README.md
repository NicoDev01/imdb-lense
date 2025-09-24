# 🎬 Film Scanner - Movie Title Recognition App


**Film Scanner** ist eine  Web App, die Filmtitel von Netflix und anderen Streaming-Plattformen mittels KI-gestützter Texterkennung erkennt und mit IMDb-Daten anreichert. Das System verwendet Google Gemini AI für hochpräzise OCR-Erkennung und bietet eine vollständige Integration mit TMDB und OMDb APIs.

![Film Scanner Logo](public/imdb-lense.png)

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF.svg)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.4.3-blue.svg)](https://capacitorjs.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5--flash--lite-blue.svg)](https://ai.google.dev/)

## ✨ Features

### 🎯 Kernfunktionalität
- **KI-gestützte OCR**: Hochpräzise und sehr schnelle Texterkennung mittels Google Gemini 2.5 Flash Lite
- **Intelligente Titel-Matching**: Erweiterte Matching-Strategie mit Confidence-Scoring
- **IMDb-Rating Integration**: Vollständige OMDb API Integration mit Ratings & Votes
- **Direkte IMDb-Links**: Ein-Klick Navigation zu IMDb-Seiten
- **Erweiterte Suche & Filter**: Debounced Live-Suche mit useDeferredValue
- **Intelligente Sortierung**: Nach Titel, Rating oder IMDb-Verfügbarkeit
- **Pull-to-Refresh**: Manuelle Daten-Aktualisierung mit Query-Invalidierung
- **Mobile-First Design**: Optimierte Touch-Bedienung für Smartphones
- **Offline-Fähigkeit**: Cached Daten für Offline-Nutzung

### 🎨 Benutzeroberfläche
- **Einheitliche Ansicht**: Alle Informationen (Titel, IMDb-ID, Rating) kombiniert
- **Confidence-Indikatoren**: Zuverlässigkeitsbewertung der Erkennungen
- **Copy-Funktionen**: Einzeln oder alle Daten kopieren
- **Direkte IMDb-Links**: Ein-Klick Navigation zu IMDb-Seiten
- **Skeleton Loading**: Bessere wahrgenommene Performance
- **Responsive Design**: Passt sich an alle Bildschirmgrößen an

### 🔧 Technische Features
- **Performance-optimiert**: React.memo, useCallback, useMemo für optimale Re-renders
- **Batch-Verarbeitung**: Effiziente API-Nutzung mit Rate-Limiting
- **Error Recovery**: Robuste Fehlerbehandlung und Fallbacks
- **Advanced Caching**: React Query mit intelligenten Stale-Times

## 🚀 Technologie-Stack

### Frontend
- **React 18** mit Hooks und Concurrent Features
- **TypeScript** für typsichere Entwicklung
- **Vite** für blitzschnelles Development und optimiertes Build
- **Tailwind CSS** für Utility-First Styling
- **shadcn/ui** für konsistente UI-Komponenten

### KI & ML
- **Gemini 2.5 Flash Lite** für optimale Performance und Genauigkeit
- **Intelligente Textverarbeitung** mit Umlaut-Erkennung und Bereinigung

### APIs & Daten
- **TMDB API** für Filmdaten und IMDb-ID Matching
- **OMDb API** für IMDb-Ratings und Statistiken
- **React Query** für effizientes API-State-Management

### Entwicklung & Qualität
- **ESLint + Prettier** für Code-Qualität

## 🏗️ Architektur

### Projektstruktur
```
src/
├── components/          # UI-Komponenten
│   ├── ui/             # shadcn/ui Basis-Komponenten
│   ├── CameraCapture.tsx    # Kamera-Interface
│   ├── MovieTitlesList.tsx  # Titel-Liste mit Modi
│   └── LoadingScreen.tsx    # OCR-Modell Initialisierung
├── hooks/              # Custom React Hooks
│   ├── useTmdb.ts      # TMDB API Integration
│   ├── useOmdb.ts      # OMDb API Integration
│   └── use-toast.ts    # Toast Notifications
├── services/           # API-Clients & Business Logic
│   ├── tmdbService.ts  # TMDB API Client
│   ├── omdbService.ts  # OMDb API Client
│   └── ocrService.ts   # OCR & ML Service
├── types/              # TypeScript Type Definitions
│   ├── tmdb.ts         # TMDB API Types
│   └── omdb.ts         # OMDb API Types
├── lib/                # Utilities & Constants
└── pages/              # Route-Komponenten
```

### Datenfluss
```
1. OCR Pipeline:
   Bild → Google Gemini AI → Rohtext → Textbereinigung → Titel

2. TMDB Pipeline:
   Titel → Enhanced Matching → TMDB Search → Best Match → IMDb-ID + Metadaten

3. OMDb Pipeline:
   IMDb-ID → OMDb Lookup → Rating + Votes

4. UI Rendering:
   Alle Daten → React Query → Optimierte UI-Updates
```

```mermaid
flowchart TD
    %% User Layer
    subgraph "👤 User Interface"
        A[📱 Film Scanner App]
        B[📷 Camera Capture]
        C[🎨 MovieTitlesList UI]
        D[⭐ Ratings Display]
        E[🔗 IMDb Links]
    end
    
    %% Frontend Processing
    subgraph "⚛️ Frontend Processing"
        F[📝 Image to Base64]
        G[🤖 OCR Service Call]
        H[🎬 TMDB API Call]
        I[⭐ OMDB API Call]
        J[🔄 React Query Cache]
    end
    
    %% Backend Services
    subgraph "🔧 Backend Services"
        K[🌟 Google Gemini AI<br/>2.5 Flash Lite]
        L[🎬 TMDB API<br/>Movie Database]
        M[⭐ OMDB API<br/>Ratings Database]
    end
    
    %% Data Flow
    A --> B
    B --> F
    F --> G
    G --> K
    
    K --> |OCR Results<br/>Movie Titles| H
    H --> L
    
    L --> |Movie Data<br/>IMDb IDs| I
    I --> M
    
    M --> |Ratings<br/>Vote Counts| J
    J --> C
    
    C --> D
    C --> E
    
    %% OCR Process Details
    G --> N[📋 Text Extraction<br/>• Image Analysis<br/>• OCR Recognition<br/>• Title Cleaning]
    K --> N
    
    %% TMDB Process Details
    H --> O[🔍 Movie Search<br/>• Title Matching<br/>• Year Filtering<br/>• IMDb ID Lookup]
    L --> O
    
    %% OMDB Process Details
    I --> P[📊 Rating Fetch<br/>• IMDb ID Input<br/>• Rating Extraction<br/>• Vote Count Parse]
    M --> P
    
    %% UI Process Details
    J --> Q[🎯 Data Integration<br/>• Title Matching<br/>• Cache Management<br/>• Error Handling]
    Q --> C
    
    %% User Interactions
    D --> R[👆 User Actions<br/>• Copy Ratings<br/>• View Details<br/>• Refresh Data]
    E --> S[🔗 External Links<br/>• Open IMDb<br/>• New Tab<br/>• Direct Navigation]
    
    %% Styling
    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style B fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style C fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style D fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style E fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style F fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style G fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style H fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style I fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style J fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style K fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style M fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style N fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style O fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    style P fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Q fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    style R fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style S fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
```

## 📱 Verwendung

### Grundlegende Bedienung

1. **App öffnen**: Film Scanner im Browser oder als PWA starten
2. **Gemini AI initialisieren**: Warten bis Google Gemini AI bereit ist
3. **Foto aufnehmen**: "Foto aufnehmen" Button drücken
4. **Kamera verwenden**: Filmcover fotografieren
5. **Ergebnisse ansehen**: Erkannte Titel werden automatisch mit IMDb-Daten angereichert

## 🔧 API-Integrationen

### TMDB (The Movie Database)

**Verwendung**: Filmdaten und IMDb-ID Matching
- **API Key**: Kostenloser Developer Key
- **Rate Limit**: ~50 req/s
- **Features**: Deutsche Lokalisierung, umfassende Filmdaten

### OMDb (Open Movie Database)

**Verwendung**: IMDb-Ratings und Statistiken
- **API Key**: Kostenloser Key (1000 req/Tag)
- **Rate Limit**: 1000 req/Tag
- **Features**: IMDb-Ratings, Vote-Counts, Metadaten

### Konfiguration

API-Keys werden über Environment Variables konfiguriert:
```env
VITE_TMDB_API_KEY=your_tmdb_key
VITE_OMDB_API_KEY=your_omdb_key
```
