# Led strip server requirements

- Ability to add multiple led controllers (e.g. multiple led strips)
  - Save local IP address and port for each controller
- Select a controller to control from UI main page
- Ability to set led strip color (RGBW) and brightness

Example POST body to set color and brightness:

```
{
 {
   "on": true,
   "r": 150,
   "g": 60,
   "b": 0,
   "w": 10,
   "br": 0.5
 }
}
```

- Ability to select (RGB) color from a color wheel in the UI
- Ability to set (RGB) brightness from the UI (e.g. a slider)
- Ability to set (W) brightness from the UI (e.g. a slider)
- Ability to turn the led strip on and off from the UI
- Ability to save the current color settings for each controller
  - List saved colors on the controller page
  - Ability to select a saved color to apply it to the led strip
  - Ability to delete saved colors from the controller page
- Ability to set controller details in the UI
  - "ui_name"
  - "ssid"
  - "pass"

Example workflow:

1. User opens the UI and sees a list of controllers (e.g. "Living Room", "Bedroom")

- 1.1 The list show current color and brightness settings for each controller (e.g. a small color preview and brightness level), which are fetched from the controller when the page loads

2. User selects the "Living Room" controller
3. User sees the current color and brightness settings for the "Living Room" led strip
4. User selects a new color from the color wheel and adjusts the brightness sliders, color applies to the led strip in real time
5. User saves the current color settings as "Relaxing Evening"
6. User can later select "Relaxing Evening" from the saved colors list to apply those
7. User can delete "Relaxing Evening" from the saved colors list if they no longer want it

- Ability to handle multiple controllers independently (e.g. changing settings for one controller does not affect the others)
- Ability to handle connection errors gracefully (e.g. if a controller is offline, show an error message in the UI)

Technical info:

- The page should support both desktop and mobile browsers
- The server makes HTTP requests to the led controllers to set colors and brightness, and to fetch current settings when the page loads

# LED Controller API Specification

This API follows **RESTful** principles using **JSON** payloads. It is hosted on the ESP8266 and includes **CORS** support to allow requests from your Unraid-hosted Vue.js frontend.

---

### **Base Configuration**

- **Protocol:** `HTTP/1.1`
- **Base URL:** `http://[DEVICE_IP]`
- **Content-Type:** `application/json`
- **CORS Status:** Enabled (`Access-Control-Allow-Origin: *`)

---

### **1. Get Device Status**

Retrieves the current state of the LED strip and the device's identity. Use this to sync the UI state on page load.

- **Endpoint:** `/api/status`
- **Method:** `GET`
- **Response Body:**

```json
{
  "ui_name": "Living Room LEDs",
  "r": 255,
  "g": 150,
  "b": 50,
  "w": 100,
  "br": 0.85,
  "on": true
}
```

### **2. Set LED State**

Updates the LED strip's color, brightness, and power state. This is the primary endpoint for controlling the LEDs.

- **Endpoint:** `/api/set`
- **Method:** `POST`
- **Request Body:**

```json
{
  "on": true,
  "r": 150,
  "g": 60,
  "b": 0,
  "w": 10,
  "br": 0.5
}
```

Logic Note: The ESP8266 automatically applies hardware multipliers (R=1.0, G=0.6, B=0.5) and clamps the final output to 255 to prevent flickering or wrapping.

Success Response: 200 OK -> {"success": true}

### **3. Update Device Configuration**

Updates persistent settings in the flash memory. Note: The device will automatically reboot 1 second after a successful request to apply new network or naming settings.

- **Endpoint:** `/api/config`
- **Method:** `POST`
- **Request Body:**

```json
{
  "ui_name": "Living Room LEDs",
  "ssid": "YourWiFiSSID",
  "pass": "YourWiFiPassword"
}
```

Success Response: 200 OK -> {"message": "Saved. Rebooting..."}

### **4. CORS Pre-flight**

Handled automatically by the controller for modern browser compatibility. Browsers send this before a POST to check permissions.

- **Endpoint:** Any
- **Method:** `OPTIONS`
- **Response Headers:** `204 No Content`

```
# LED GATEWAY API SPECIFICATION (V3 - PERSISTENT MONOLITH)

This API serves as the central brain for the LED system. It manages a registry of controllers, stores user-defined color presets in a persistent JSON database, and proxies real-time commands to the physical ESP8266 hardware.

---

### BASE CONFIGURATION
* Protocol: HTTP/1.1
* Base URL: http://[UNRAID_IP]:3000
* Content-Type: application/json
* CORS: Enabled (Supports cross-origin requests from development environments)

---

### 1. INITIALIZATION & REGISTRY
Use this endpoint when the Vue app first loads to retrieve the entire system state.

* Endpoint: /api/init
* Method: GET
* Description: Returns all registered controllers and all saved presets.
* Response Body:
{
  "controllers": [
    { "id": "kitchen-1", "ip": "192.168.1.50", "port": 80, "ui_name": "Kitchen LEDs" }
  ],
  "presets": {
    "kitchen-1": [
      { "id": 1708963200, "name": "Cozy Warm", "state": { "on": true, "r": 255, "g": 100, "b": 20, "w": 50, "br": 0.5 } }
    ]
  }
}

---

### 2. CONTROLLER MANAGEMENT
Add a new physical LED strip to the system or update the connection details of an existing one.

* Endpoint: /api/controllers
* Method: POST
* Payload Example:
{
  "id": "kitchen-main",
  "ip": "192.168.1.50",
  "port": 80,
  "ui_name": "Kitchen LEDs"
}

---

### 3. REAL-TIME LED CONTROL (PROXY)
This endpoint forwards commands from the UI directly to the ESP8266. This bypasses CORS issues in the browser by routing through the Node.js server.

* Endpoint: /api/proxy/:controllerId/set
* Method: POST
* Description: Forwards the JSON body to the ESP8266 associated with the :controllerId.
* Request Body:
{
  "on": true,
  "r": 150,
  "g": 60,
  "b": 0,
  "w": 10,
  "br": 0.5
}
* Success Response: 200 OK -> {"success": true}
* Error Response: 502 Bad Gateway (Returned if the ESP8266 is offline or unreachable).

---

### 4. PRESETS (PERSISTENCE)
Manage saved color profiles. These are stored in data.json on the server and survive restarts.

#### SAVE A PRESET
* Endpoint: /api/presets/:controllerId
* Method: POST
* Payload: { "name": "Relaxing Evening", "state": { "on": true, "r": 20, "g": 0, "b": 100, "w": 0, "br": 0.3 } }

#### DELETE A PRESET
* Endpoint: /api/presets/:controllerId/:presetId
* Method: DELETE
* Description: Removes a specific preset from the collection.

---

### 5. FRONTEND STATIC SERVING
The backend is configured to serve the built Vue application automatically.

* Static Path: / (Serves index.html)
* Assets Path: /assets/* (Serves JS/CSS files)
* Fallback: Any non-API route (e.g., /settings or /dashboard) is redirected to the Vue index.html to allow Vue Router to handle navigation.
```
