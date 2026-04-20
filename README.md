# BrokerApp - Full-Stack Advisor Portal

BrokerApp is a full-stack web application designed for insurance brokers and advisors to manage policy submissions. It features an **ASP.NET Core Web API** backend with **Firebase Authentication** and a **React + Vite** frontend.

## 🚀 Technology Stack

### Backend (brokerApp.API)
- **Framework:** .NET 10.0 (ASP.NET Core Web API)
- **Database:** PostgreSQL with Entity Framework Core (Npgsql)
- **Authentication:** Firebase JWT Bearer Authentication
- **Documentation:** Swagger (Swashbuckle) with Bearer token support
- **ORM:** Entity Framework Core (Code-First Migrations)

### Frontend (brokerApp.client)
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **Styling:** CSS3 (Modern visuals)
- **Icons:** Custom SVG icons

---

## 🛠️ Local Setup

### 1. Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) (LTS recommended)
- [PostgreSQL](https://www.postgresql.org/) instance running locally

### 2. Backend Configuration
Navigate to `brokerApp.API/` and update `appsettings.json`:
- **ConnectionStrings**: Set your PostgreSQL connection string for `DefaultConnection`.
- **Firebase:ProjectId**: Replace with your actual Firebase Project ID.

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=brokerdb;Username=postgres;Password=yourpassword"
},
"Firebase": {
  "ProjectId": "your-firebase-project-id"
}
```

### 3. Run the Database Migrations
In the `brokerApp.API/` folder:
```bash
dotnet ef database update
```

### 4. Run the API
```bash
dotnet run
```
The API will be available at `https://localhost:7041` (or the port specified in `launchSettings.json`). You can access the Swagger documentation at `/swagger`.

### 5. Frontend Setup
Navigate to `brokerApp.client/`:
```bash
npm install
npm run dev
```
The client will run at `http://localhost:5173`.

---

## 📂 Project Structure

- **`brokerApp.API/`**:
  - `Controllers/`: Contains the `SubmissionsController` for managing policy entries.
  - `Data/`: `ApplicationDbContext` for EF Core operations.
  - `Models/`: Data models like `Submission`.
  - `Migrations/`: Database schema version history.
  - `Program.cs`: Global configuration for Auth, DB, CORS, and Swagger.
- **`brokerApp.client/`**:
  - `src/`: React source code (Components, Assets, App logic).
  - `public/`: Static assets and icons.

---

## 🔒 Authentication
This application uses **Firebase Authentication**. 
- To test the API directly via Swagger, click the **Authorize** button and enter a valid Firebase JWT token: `Bearer <token>`.
- The `SubmissionsController` uses the `[Authorize]` attribute to ensure only authenticated advisors can view or create submissions.
- Submissions are automatically filtered by the `AdvisorId` (extracted from the Firebase JWT `user_id` claim).

---

## 📈 API Endpoints

### Submissions
- `POST /api/Submissions`: Create a new policy submission.
- `GET /api/Submissions`: Retrieve all submissions for the authenticated advisor.

---

## 📝 License
This project is private and intended for internal use.
