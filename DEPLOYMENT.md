# Deploying AgencyFlow

This guide explains how to deploy the AgencyFlow application using Docker and NGINX Proxy Manager.

## 📋 Prerequisites

1.  **Server (VPS)** with Ubuntu/Debian properly secured.
2.  **Docker** & **Docker Compose** installed.
3.  **NGINX Proxy Manager** running in a Docker container.
    *   *Note: AgencyFlow is configured to join an external Docker network named `proxy-netz`. Make sure your NGINX Proxy Manager is also on this network.*

## 🚀 Installation Steps

1.  **Clone the Repository** (or upload files) to your server:
    ```bash
    git clone <your-repo-url> /opt/docker/agencyflow
    cd /opt/docker/agencyflow
    ```

2.  **Configuration**:
    Create a `.env` file with your Supabase credentials:
    ```bash
    # .env
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key-here
    APP_PORT=3002
    ```

3.  **Run the Installer**:
    We have provided an automated script to handle permissions and startup.
    ```bash
    chmod +x install.sh
    ./install.sh
    ```

    *If successful, you will see:*
    > ✅ Installation successful!
    > 🌐 App is running on localhost:3002

---

## 🌐 NGINX Proxy Manager Setup

To make your app accessible from the internet (e.g., `app.agencyflow.com`), configure a Proxy Host in NGINX Proxy Manager.

### 1. Add Proxy Host
1.  Log in to NGINX Proxy Manager.
2.  Click **"Proxy Hosts"** -> **"Add Proxy Host"**.

### 2. Details Tab
*   **Domain Names**: `app.agencyflow.com` (or your chosen domain)
*   **Scheme**: `http`
*   **Forward Hostname / IP**: `agencyflow-app`
    *   *Since both containers are in the `proxy-netz` Docker network, you can use the container name `agencyflow-app` directly.*
    *   *Alternatively, use the server's local IP (e.g., `172.17.0.1` or server public IP).*
*   **Forward Port**: `80`
    *   *Inside the Docker network, the container listens on port 80.*
*   **Cache Assets**: ✅ Turn On
*   **Block Common Exploits**: ✅ Turn On
*   **Websockets Support**: ✅ Turn On (Crucial for Realtime features!)

### 3. SSL Tab
*   **SSL Certificate**: "Request a new SSL Certificate"
*   **Force SSL**: ✅ Turn On
*   **HTTP/2 Support**: ✅ Turn On
*   **Email**: Enter your email for Let's Encrypt.
*   **Agree to Terms**: ✅ Check.

### 4. Save & Test
Click **Save**. Go to `https://app.agencyflow.com` in your browser. You should see the login screen.

---

## 🛠️ Troubleshooting

*   **"502 Bad Gateway"**:
    *   Check if `agencyflow-app` container is running: `docker ps`
    *   Check if NGINX Proxy Manager is in the same network (`proxy-netz`).
    *   Try changing "Forward Hostname" to your server's IP address and Port to `3002`.

*   **"Realtime updates not working"**:
    *   Ensure **Websockets Support** is enabled in NGINX Proxy Manager.

*   **"Permission denied" on install.sh**:
    *   Run `chmod +x install.sh`
