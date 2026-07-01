┌─────────────────-┐       TCP/TLS        ┌──────────────────────┐
│  Teltonika       │ ──────────────────▶  │  IoT Ingestion       │
│FMC130/B120 Tracker│  Codec 8 / 8 Ext    │  Server (Node.js)    │
└─────────────────-┘                       └──────────┬───────────┘
                                                     │
                                          ┌──────────▼───────────┐
                                          │  PostgreSQL / Redis   │
                                          └──────────┬───────────┘
                                                     │
                              ┌───────────────────────┼───────────────────────┐
                              │                       │                       │
                   ┌──────────▼──────────┐ ┌─────────▼─────────┐ ┌──────────▼──────────┐
                   │  REST API           │ │  Socket.IO         │ │  Next.js Dashboard  │
                   │  (Express)          │ │  (Real-time)       │ │  (Web)              │
                   └──────────┬──────────┘ └─────────┬─────────┘ └─────────────────────┘
                              │                       │
                   ┌──────────▼───────────────────────▼──────────┐
                   │  React Native (Expo) Mobile App             │
                   │  iOS + Android                              │
                   └─────────────────────────────────────────────┘
                   
                   
Features

Binary Protocol Parsing — Custom TCP/TLS server that decodes Teltonika Codec 8 & Codec 8 Extended binary protocol in real-time
Live Vehicle Tracking — Real-time position updates via Socket.IO with sub-second latency
Trip Detection — Automatic trip start/stop detection with route history and mileage calculation
Geofencing — Configurable geofence zones with push notification alerts on entry/exit
OBD Diagnostics — DTC (Diagnostic Trouble Code) event parsing and display from CAN bus data
Driver Management — Driver profiles linked to vehicles with activity tracking
Maintenance Tracking — Service intervals, reminders, and maintenance history per vehicle
Audit Logging — Full audit trail for compliance and fleet accountability
Multi-Tenant Architecture — Tenant isolation with JWT authentication and role-based access control (admin, manager, driver)


Tech Stack

LayerTechnologyIoT ServerNode.js, custom TCP/TLS socket serverProtocolTeltonika Codec 8 / Codec 8 Extended binary parsingAPIExpress.js REST APIReal-timeSocket.IODatabasePostgreSQLCacheRedisMobile AppReact Native (Expo) — iOS & AndroidWeb DashboardNext.jsAuthJWT + refresh tokens, RBACDeploymentFly.io (Amsterdam region)HardwareTeltonika FMC130 GPS trackers

Project Structure

fleet-app/
├── server/                 # IoT ingestion server + REST API
│   ├── tcp/                # TCP/TLS server & Codec 8 parser
│   ├── routes/             # Express API routes
│   ├── models/             # Database models
│   ├── middleware/          # Auth, RBAC, validation
│   └── services/           # Business logic (trips, geofence, alerts)
├── mobile/                 # React Native (Expo) app
│   ├── screens/            # App screens
│   ├── components/         # Reusable UI components
│   └── services/           # API client & Socket.IO handlers
├── dashboard/              # Next.js web dashboard
└── docs/                   # Protocol documentation & API specs

Getting Started

Prerequisites


Node.js 18+
PostgreSQL 15+
Redis
A Teltonika FMC130 device (or simulator for development)


Installation

bash# Clone the repository
git clone https://github.com/AdiBasa7/fleet-telemetry-saas.git
cd fleet-telemetry-saas

# Install server dependencies
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and Fly.io config

# Run database migrations
npm run migrate

# Start the IoT server + API
npm run dev

Mobile App

bashcd mobile
npm install
npx expo start

Web Dashboard

bashcd dashboard
npm install
npm run dev

Teltonika Protocol

The IoT server implements a full binary parser for:


Codec 8 — Standard AVL data packets with GPS, I/O elements, and timestamps
Codec 8 Extended — Extended format supporting 2-byte I/O element IDs for OBD and CAN bus data


Each TCP connection handles device authentication via IMEI handshake, followed by continuous AVL data streaming with server-side acknowledgment.

Deployment

The platform runs on Fly.io in the Amsterdam region with:


Auto-scaling for the TCP ingestion server
Persistent PostgreSQL via Fly Postgres
Redis for session management and real-time pub/sub


Context

This project started as a practical solution for a real fleet of ~10 waste collection vehicles at Retim/Nimu Dragos in Timișoara, Romania. The hardware integration (GPS modules, RFID antennas, cameras, Raspberry Pi controllers) was done hands-on — from wiring and mounting in the trucks to configuring Teltonika devices and connecting to the company's server infrastructure.

License

MIT

Author

Adrian Bașa — Electronics & Telecommunications Engineering, Polytechnic University of Timișoara


LinkedIn
GitHub
