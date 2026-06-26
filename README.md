# fit-PRO Backend Server

This is the backend server for the fit-PRO application, built with Node.js, Express, and MongoDB. It provides an API for fitness-related functionalities and uses Google's Generative AI.

## Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB account/cluster
- Google Gemini API Key

## Setup

1. **Clone the repository** (or download the source):
   ```bash
   git clone <repository-url>
   cd fit-PRO-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and fill in your own values.
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in:
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - other secrets as required.

## Running the Server

**Development Mode** (with nodemon):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The server will start on the port specified in your `.env` file (default `8080`).

## Technologies Used

- Express.js
- Mongoose (MongoDB)
- JWT (Authentication)
- Google Generative AI
- Mailgen & Nodemailer
- Swagger (API Documentation)
- Winston & Morgan (Logging)
- Zod (Validation)
