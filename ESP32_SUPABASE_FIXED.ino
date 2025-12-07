/*
 * ESP32 Stroke Counter -> Supabase
 * Replaces Google Sheets integration with Supabase REST API.
 * Buffering and display logic are kept from the previous program.
 */

 #include <WiFi.h>
 #include <HTTPClient.h>
 #include <ArduinoJson.h>
 #include <TFT_eSPI.h>
 #include <SPI.h>
 #include <time.h>
 #include <math.h>
 
 // ============================================================================
 // NETWORK CONFIGURATION
 // ============================================================================
 const char* ssid = "Sachin";       // Wi-Fi SSID
 const char* password = "Til12345"; // Wi-Fi password
 
 // ============================================================================
 // SUPABASE CONFIGURATION
 // ============================================================================
 const char* supabaseUrl = "https://tzoloagoaysipwxuyldu.supabase.co";
 const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b2xvYWdvYXlzaXB3eHV5bGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDM3MzIsImV4cCI6MjA3ODk3OTczMn0.BwC-uFnlkWtaGNVEee4VFuL-trsdz1aawDC77F3afWk";
 const char* iotDatabaseTable = "IoT%20Database";  // URL-encoded table name
 const char* settingsTable = "settings";
 
 // ============================================================================
 // MACHINE CONFIGURATION
 // ============================================================================
 const char* machineNo = "10000707_500_SUMMITO"; // Must match settings.machine
 const char* plant = "DMCPLI_3001";              // Must match settings.plant
 
 // ============================================================================
 // STROKE DETECTION CONFIGURATION
 // ============================================================================
 const bool USE_DUAL_SWITCH_MODE = false; // true = dual switch, false = single switch
 const bool SWITCH_NORMALLY_OPEN = true;  // true = NO, false = NC
 
 const int startLimitPin = 15; // D15
 const int endLimitPin = 19;   // D19 (dual mode only)
 const unsigned long debounceDelay = 50;
 
 // ============================================================================
 // DISPLAY CONFIGURATION
 // ============================================================================
 const unsigned long displayAutoRefreshMinutes = 30;
 
 // ============================================================================
 // DATA TRANSMISSION CONFIGURATION
 // ============================================================================
 const unsigned long sendInterval = 60000;     // 1 minute
 const unsigned long reconnectInterval = 5000; // 5 seconds
 
 // ============================================================================
 // PROGRAM VARIABLES (DO NOT MODIFY)
 // ============================================================================
 TFT_eSPI tft = TFT_eSPI();
 
 unsigned long lastDisplayUpdate = 0;
 unsigned long lastDisplayReferenceResponse = 0;
 unsigned long lastDataSendFailure = 0;
 unsigned long lastDisplayReinit = 0;
 
 int lastStrokeCount = 0;
 bool lastWiFiStatus = false;
 int lastTotalCount = 0;
 String lastTargetCount = "";
 String lastActualCount = "";
 int lastFailedStrokeCount = 0;
 
 volatile int strokeCount = 0;
 volatile int failedStrokeCount = 0;
 bool startLimitPrevState = HIGH;
 bool startLimitCurrentState = HIGH;
 bool endLimitPrevState = HIGH;
 bool endLimitCurrentState = HIGH;
 unsigned long lastDebounceTime = 0;
 
 enum StrokeState { WAITING_FOR_START, WAITING_FOR_END };
 StrokeState currentStrokeState = WAITING_FOR_START;
 
 unsigned long lastSendTime = 0;
 unsigned long lastReconnectAttempt = 0;
 TaskHandle_t supabaseTaskHandle;
 
 // ============================================================================
 // SETTINGS DATA STRUCTURE
 // ============================================================================
 struct Settings {
   String plant;
   String partNo;
   String partName;
   String operation;
   String cycleTime;
   String partCountPerCycle;
   String inspection;
   String cellName;
   String cellLeader;
   String workStations;
   String mandays;
   String toolCode;
   String operatorCode;
   String lossReasons;
   String targetCount;
   String actualCount;
 } currentSettings;
 
 // ============================================================================
 // HELPER FUNCTIONS
 // ============================================================================
 long parseLongSafe(const String& value) {
   if (value.length() == 0) return 0;
   return (long) value.toFloat(); // handles "4.00" -> 4
 }
 
 void connectToWiFi() {
   if (WiFi.status() != WL_CONNECTED) {
     Serial.println("Attempting to connect to Wi-Fi...");
     WiFi.begin(ssid, password);
   }
 }
 
 void reconnectWiFiIfNeeded() {
   if (WiFi.status() != WL_CONNECTED && (millis() - lastReconnectAttempt >= reconnectInterval)) {
     lastReconnectAttempt = millis();
     connectToWiFi();
   }
 }
 
 String getIsoTimestamp() {
   struct tm timeinfo;
   if (!getLocalTime(&timeinfo, 2000)) {
     Serial.println("Failed to get NTP time");
     return "";
   }
   char buffer[25];
   strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo); // UTC
   return String(buffer);
 }
 
 // ============================================================================
 // DISPLAY FUNCTIONS
 // ============================================================================
 void updateLiveCountOnly() {
   tft.fillRect(120, 320, 200, 40, TFT_BLACK);
   tft.setTextColor(TFT_ORANGE, TFT_BLACK);
   tft.drawString(String(strokeCount), 120, 320, 6);
 }
 
 void updateTargetAndTotalOnly() {
   tft.fillRect(120, 205, 200, 40, TFT_BLACK);
   tft.setTextColor(TFT_YELLOW, TFT_BLACK);
   tft.drawString(currentSettings.targetCount, 120, 205, 6);
 
   int currentTotalCount = currentSettings.actualCount.toInt() + failedStrokeCount;
   tft.fillRect(120, 265, 200, 40, TFT_BLACK);
   tft.setTextColor(TFT_YELLOW, TFT_BLACK);
   tft.drawString(String(currentTotalCount), 120, 265, 6);
 }
 
 void updateBufferedStrokeDisplay() {
   tft.fillRect(10, 365, 300, 40, TFT_BLACK);
   if (failedStrokeCount > 0) {
     tft.setTextColor(TFT_ORANGE, TFT_BLACK);
     tft.drawString("Buffered Strokes: " + String(failedStrokeCount), 10, 365, 4);
     tft.drawString("(Waiting for Internet...)", 10, 385, 4);
   }
 }
 
 void reinitializeDisplayBackground() {
   tft.init();
   tft.setRotation(2);
   tft.fillScreen(TFT_BLACK);
   tft.setTextColor(TFT_WHITE, TFT_BLACK);
   tft.setTextSize(1);
 
   lastDisplayReinit = millis();
 
   lastStrokeCount = -1;
   lastWiFiStatus = !(WiFi.status() == WL_CONNECTED);
   lastTotalCount = -1;
   lastTargetCount = "";
   lastActualCount = "";
   lastFailedStrokeCount = -1;
 }
 
 void updateDisplay() {
   static bool isInitialDisplay = true;
 
   bool needsUpdate = false;
 
   if (strokeCount != lastStrokeCount) {
     needsUpdate = true;
     lastStrokeCount = strokeCount;
   }
 
   bool currentWiFiStatus = (WiFi.status() == WL_CONNECTED);
   if (currentWiFiStatus != lastWiFiStatus) {
     needsUpdate = true;
     lastWiFiStatus = currentWiFiStatus;
   }
 
   int currentTotalCount = currentSettings.actualCount.toInt() + failedStrokeCount;
   if (currentTotalCount != lastTotalCount) {
     needsUpdate = true;
     lastTotalCount = currentTotalCount;
   }
 
   if (currentSettings.targetCount != lastTargetCount) {
     lastTargetCount = currentSettings.targetCount;
     updateTargetAndTotalOnly();
     lastDisplayUpdate = millis();
   }
 
   if (currentSettings.actualCount != lastActualCount) {
     lastActualCount = currentSettings.actualCount;
     updateTargetAndTotalOnly();
     lastDisplayUpdate = millis();
   }
 
   if (failedStrokeCount != lastFailedStrokeCount) {
     lastFailedStrokeCount = failedStrokeCount;
     updateBufferedStrokeDisplay();
     lastDisplayUpdate = millis();
   }
 
   if (!needsUpdate && !isInitialDisplay) {
     return;
   }
 
   tft.fillScreen(TFT_BLACK);
 
   tft.setTextColor(TFT_CYAN, TFT_BLACK);
   // Top row: machine + plant without pushing other rows down
   tft.drawString("Machine:", 10, 5, 2);
   tft.drawString(String(machineNo), 10, 25, 4);
 
   tft.setTextColor(TFT_GREEN, TFT_BLACK);
   tft.drawString("Part:", 10, 55, 2);
   tft.drawString(currentSettings.partName, 10, 75, 4);
 
   tft.drawString("Operation:", 10, 105, 2);
   tft.drawString(currentSettings.operation, 10, 125, 4);
 
   tft.setTextColor(TFT_CYAN, TFT_BLACK);
   tft.drawString("Operator:", 10, 155, 2);
   tft.drawString(currentSettings.operatorCode, 10, 175, 4);
 
   tft.setTextColor(TFT_YELLOW, TFT_BLACK);
   tft.drawString("TARGET:", 10, 205, 2);
   tft.drawString(currentSettings.targetCount, 120, 205, 6);
 
   tft.drawString("TOTAL:", 10, 265, 2);
   tft.drawString(String(currentTotalCount), 120, 265, 6);
 
   tft.setTextColor(TFT_ORANGE, TFT_BLACK);
   tft.drawString("LIVE COUNT", 10, 320, 2);
   tft.setTextColor(TFT_GREENYELLOW, TFT_BLACK);
   tft.drawString("(This Minute):", 10, 340, 2);
   tft.setTextColor(TFT_ORANGE, TFT_BLACK);
   tft.drawString(String(strokeCount), 120, 320, 6);
 
   if (failedStrokeCount > 0) {
     tft.setTextColor(TFT_ORANGE, TFT_BLACK);
     tft.drawString("Buffered Strokes: " + String(failedStrokeCount), 10, 365, 4);
     tft.drawString("(Waiting for Internet...)", 10, 385, 4);
   }
 
   tft.setTextColor(TFT_GREEN, TFT_BLACK);
   tft.drawString("LOSS:", 10, 415, 2);
   String lossReason = currentSettings.lossReasons.length() > 0 ? currentSettings.lossReasons : "None";
   tft.drawString(lossReason, 10, 430, 4);
 
   uint16_t wifiColor = WiFi.status() == WL_CONNECTED ? TFT_GREEN : TFT_RED;
   tft.setTextColor(wifiColor, TFT_BLACK);
   tft.drawString("WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"), 10, 460, 4);
 
   if (WiFi.status() == WL_CONNECTED) {
     isInitialDisplay = false;
   }
 }
 
 // ============================================================================
 // STROKE DETECTION
 // ============================================================================
 void dualSwitchMode() {
   startLimitCurrentState = digitalRead(startLimitPin);
   endLimitCurrentState = digitalRead(endLimitPin);
 
   static bool lastStartState = HIGH;
   static bool lastEndState = HIGH;
   static StrokeState lastReportedState = WAITING_FOR_START;
 
   if (startLimitCurrentState != lastStartState || endLimitCurrentState != lastEndState || currentStrokeState != lastReportedState) {
     Serial.print("Switch States Changed - Start (D15): ");
     Serial.print(startLimitCurrentState ? "HIGH" : "LOW");
     Serial.print(" | End (D19): ");
     Serial.print(endLimitCurrentState ? "HIGH" : "LOW");
     Serial.print(" | State: ");
     Serial.println(currentStrokeState == WAITING_FOR_START ? "WAITING_FOR_START" : "WAITING_FOR_END");
     lastStartState = startLimitCurrentState;
     lastEndState = endLimitCurrentState;
     lastReportedState = currentStrokeState;
   }
 
   if ((millis() - lastDebounceTime) > debounceDelay) {
     if (startLimitPrevState == HIGH && startLimitCurrentState == LOW) {
       if (currentStrokeState == WAITING_FOR_START) {
         currentStrokeState = WAITING_FOR_END;
         Serial.println("✓ Stroke start detected - waiting for end");
       }
       lastDebounceTime = millis();
     } else if (startLimitPrevState == LOW && startLimitCurrentState == HIGH) {
       lastDebounceTime = millis();
     }
 
     if (endLimitPrevState == HIGH && endLimitCurrentState == LOW) {
       if (currentStrokeState == WAITING_FOR_END) {
         noInterrupts();
         strokeCount++;
         interrupts();
         currentStrokeState = WAITING_FOR_START;
         lastDebounceTime = millis();
         Serial.println("✓ Complete stroke detected!");
         updateLiveCountOnly();
         lastDisplayUpdate = millis();
       }
     } else if (endLimitPrevState == LOW && endLimitCurrentState == HIGH) {
       lastDebounceTime = millis();
     }
   }
 
   startLimitPrevState = startLimitCurrentState;
   endLimitPrevState = endLimitCurrentState;
 }
 
 void singleSwitchMode() {
   startLimitCurrentState = digitalRead(startLimitPin);
 
   static bool lastReportedState = HIGH;
   if (startLimitCurrentState != lastReportedState) {
     Serial.print("Switch State Changed: ");
     Serial.print(startLimitCurrentState ? "HIGH" : "LOW");
     Serial.print(" | Prev: ");
     Serial.println(startLimitPrevState ? "HIGH" : "LOW");
     lastReportedState = startLimitCurrentState;
   }
 
   if ((millis() - lastDebounceTime) > debounceDelay) {
     if (startLimitPrevState == HIGH && startLimitCurrentState == LOW) {
       lastDebounceTime = millis();
     } else if (startLimitPrevState == LOW && startLimitCurrentState == HIGH) {
       noInterrupts();
       strokeCount++;
       interrupts();
       lastDebounceTime = millis();
       Serial.println("=== STROKE DETECTED ===");
       updateLiveCountOnly();
       lastDisplayUpdate = millis();
     }
   }
 
   startLimitPrevState = startLimitCurrentState;
 }
 
 // ============================================================================
 // SUPABASE HELPERS
 // ============================================================================
 void addSupabaseHeaders(HTTPClient& http) {
   http.addHeader("apikey", supabaseAnonKey);
   http.addHeader("Authorization", String("Bearer ") + supabaseAnonKey);
   http.addHeader("Content-Type", "application/json");
 }
 
 bool fetchSettingsData() {
   if (WiFi.status() != WL_CONNECTED) {
     Serial.println("Wi-Fi not connected. Cannot fetch settings.");
     return false;
   }
 
   HTTPClient http;
   String url = String(supabaseUrl) + "/rest/v1/" + settingsTable +
                "?select=plant,part_no,part_name,operation,cycle_time,part_count_per_cycle,inspection_applicability,cell_name,cell_leader,workstations,mandays,tool_code,operator_code,loss_reason,target_count,actual_count,machine" +
                "&plant=eq." + plant +
                "&machine=eq." + machineNo +
                "&limit=1";
 
   Serial.print("Fetching settings from: ");
   Serial.println(url);
 
   http.begin(url);
   addSupabaseHeaders(http);
 
   int httpResponseCode = http.GET();
   if (httpResponseCode <= 0) {
     Serial.print("Error fetching settings: ");
     Serial.println(httpResponseCode);
     http.end();
     return false;
   }
 
   String response = http.getString();
   Serial.print("Settings response: ");
   Serial.println(response);
 
   StaticJsonDocument<2048> doc;
   DeserializationError error = deserializeJson(doc, response);
   if (error || !doc.is<JsonArray>() || doc.as<JsonArray>().size() == 0) {
     Serial.println("Failed to parse settings JSON or no data");
     http.end();
     return false;
   }
 
   JsonObject row = doc[0];
   currentSettings.plant = row["plant"] | "";
   currentSettings.partNo = row["part_no"] | "";
   currentSettings.partName = row["part_name"] | "";
   currentSettings.operation = row["operation"] | "";
   currentSettings.cycleTime = row["cycle_time"].isNull() ? "" : String(row["cycle_time"].as<float>());
   currentSettings.partCountPerCycle = row["part_count_per_cycle"].isNull() ? "" : String(row["part_count_per_cycle"].as<float>());
   currentSettings.inspection = row["inspection_applicability"] | "";
   currentSettings.cellName = row["cell_name"] | "";
   currentSettings.cellLeader = row["cell_leader"] | "";
   currentSettings.workStations = row["workstations"].isNull() ? "" : String(row["workstations"].as<float>());
   currentSettings.mandays = row["mandays"].isNull() ? "" : String(row["mandays"].as<float>());
   currentSettings.toolCode = row["tool_code"] | "";
   currentSettings.operatorCode = row["operator_code"] | "";
   currentSettings.lossReasons = row["loss_reason"] | "";
   currentSettings.targetCount = row["target_count"].isNull() ? "0" : String(row["target_count"].as<int>());
   currentSettings.actualCount = row["actual_count"].isNull() ? "0" : String(row["actual_count"].as<int>());
 
   lastDisplayReferenceResponse = millis();
   http.end();
   return true;
 }
 
 bool sendDataToSupabase(int totalStrokes) {
   if (WiFi.status() != WL_CONNECTED) {
     Serial.println("Wi-Fi disconnected. Cannot send data.");
     return false;
   }
 
   HTTPClient http;
   String url = String(supabaseUrl) + "/rest/v1/" + iotDatabaseTable;
   http.begin(url);
   addSupabaseHeaders(http);
   http.addHeader("Prefer", "return=representation");
 
   StaticJsonDocument<512> doc;
   JsonObject row = doc.to<JsonObject>();
 
   String isoTime = getIsoTimestamp();
   if (isoTime.length() > 0) {
     row["Timestamp"] = isoTime;
   }
   row["Part No."] = currentSettings.partNo;
   row["Part Name"] = currentSettings.partName;
   row["Operation"] = currentSettings.operation;
   row["Cycle Time"] = parseLongSafe(currentSettings.cycleTime);
   row["Part Count Per Cycle"] = parseLongSafe(currentSettings.partCountPerCycle);
   row["Inspection Applicability"] = currentSettings.inspection;
   row["Cell Name"] = currentSettings.cellName;
   row["Cell Leader"] = currentSettings.cellLeader;
   row["Work Stations"] = parseLongSafe(currentSettings.workStations);
   row["Mandays"] = parseLongSafe(currentSettings.mandays);
   row["Tool Code"] = currentSettings.toolCode;
   row["Operator Code"] = currentSettings.operatorCode;
   row["Loss Reasons"] = currentSettings.lossReasons;
   row["Machine No."] = machineNo;
   row["Value"] = totalStrokes;
   row["Plant"] = plant;
 
   String jsonString;
   serializeJson(doc, jsonString);
 
   Serial.println("\nSending data to Supabase:");
   Serial.print("URL: ");
   Serial.println(url);
   Serial.print("JSON Data: ");
   Serial.println(jsonString);
 
   int httpResponseCode = http.POST(jsonString);
   if (httpResponseCode > 0) {
     String response = http.getString();
     Serial.print("Supabase response: ");
     Serial.println(response);
     bool ok = httpResponseCode >= 200 && httpResponseCode < 300;
     http.end();
     return ok;
   } else {
     Serial.print("Error sending data to Supabase: ");
     Serial.println(httpResponseCode);
     http.end();
     return false;
   }
 }
 
 // ============================================================================
 // TASK: SEND DATA
 // ============================================================================
 void sendDataToSupabaseTask(void* parameter) {
   for (;;) {
     if (millis() - lastSendTime >= sendInterval) {
       lastSendTime = millis();
 
       int totalStrokes;
       noInterrupts();
       totalStrokes = strokeCount + failedStrokeCount;
       failedStrokeCount = 0;
       strokeCount = 0;
       interrupts();
 
       if (WiFi.status() == WL_CONNECTED) {
         if (!fetchSettingsData()) {
           Serial.println("Failed to fetch settings before send");
           noInterrupts();
           failedStrokeCount = totalStrokes;
           interrupts();
           lastDataSendFailure = millis();
           continue;
         }
 
         if (sendDataToSupabase(totalStrokes)) {
           Serial.println("Data sent successfully to Supabase");
           if (fetchSettingsData()) {
             Serial.println("Settings refreshed after send");
           } else {
             Serial.println("Failed to refresh settings after send");
           }
         } else {
           noInterrupts();
           failedStrokeCount = totalStrokes;
           interrupts();
           lastDataSendFailure = millis();
         }
       } else {
         Serial.println("Wi-Fi disconnected!");
         noInterrupts();
         failedStrokeCount = totalStrokes;
         interrupts();
         lastDataSendFailure = millis();
       }
     }
     vTaskDelay(1000 / portTICK_PERIOD_MS);
   }
 }
 
 // ============================================================================
 // SETUP & LOOP
 // ============================================================================
 void setup() {
   Serial.begin(115200);
 
   tft.init();
   tft.setRotation(2);
   tft.fillScreen(TFT_BLACK);
   tft.setTextColor(TFT_WHITE, TFT_BLACK);
   tft.setTextSize(1);
   tft.drawString("Initializing...", 10, 10, 4);
 
   pinMode(startLimitPin, INPUT_PULLUP);
   pinMode(endLimitPin, INPUT_PULLUP);
 
   Serial.println("=== PIN TEST ===");
   Serial.print("Start Pin (D15) initial state: ");
   Serial.println(digitalRead(startLimitPin) ? "HIGH" : "LOW");
   Serial.print("End Pin (D19) initial state: ");
   Serial.println(digitalRead(endLimitPin) ? "HIGH" : "LOW");
   Serial.println("=== END PIN TEST ===");
 
   Serial.println("=== MODE CONFIGURATION ===");
   if (USE_DUAL_SWITCH_MODE) {
     Serial.println("✓ DUAL SWITCH MODE ENABLED");
     Serial.println("  - Start Switch: D15");
     Serial.println("  - End Switch: D19");
     Serial.println("  - Stroke recorded only when both switches activate in sequence");
   } else {
     Serial.println("✓ SINGLE SWITCH MODE ENABLED");
     Serial.println("  - Single Switch: D15");
     Serial.println("  - Stroke recorded on each switch activation");
   }
 
   Serial.println("=== SWITCH TYPE CONFIGURATION ===");
   if (SWITCH_NORMALLY_OPEN) {
     Serial.println("✓ NORMALLY OPEN (NO) SWITCH CONFIGURED");
     Serial.println("  - Switch is HIGH when not pressed");
     Serial.println("  - Switch goes LOW when pressed");
   } else {
     Serial.println("✓ NORMALLY CLOSED (NC) SWITCH CONFIGURED");
     Serial.println("  - Switch is LOW when not pressed");
     Serial.println("  - Switch goes HIGH when pressed");
   }
   Serial.println("=== END SWITCH TYPE CONFIGURATION ===");
 
   configTime(0, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");
 
   connectToWiFi();
   fetchSettingsData();
   updateDisplay();
 
   xTaskCreate(
     sendDataToSupabaseTask,
     "Supabase Task",
     8192,
     NULL,
     1,
     &supabaseTaskHandle);
 }
 
 void loop() {
   if (USE_DUAL_SWITCH_MODE) {
     dualSwitchMode();
   } else {
     singleSwitchMode();
   }
 
   if (lastDisplayReferenceResponse > 0 && (millis() - lastDisplayReferenceResponse >= 5000)) {
     lastDisplayReferenceResponse = 0;
     updateDisplay();
     Serial.println("5-second display update after settings refresh");
   }
 
   if (lastDataSendFailure > 0 && (millis() - lastDataSendFailure >= 5000)) {
     lastDataSendFailure = 0;
     updateDisplay();
     Serial.println("5-second display update after data send failure");
   }
 
   if (millis() - lastDisplayReinit >= (displayAutoRefreshMinutes * 60000)) {
     reinitializeDisplayBackground();
     updateDisplay();
     Serial.println("Display content restored after reinitialization");
   }
 
   reconnectWiFiIfNeeded();
 }
 
 