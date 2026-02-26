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
