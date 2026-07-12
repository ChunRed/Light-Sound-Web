#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h> // 整合：安全連線庫
#include <Wire.h>
#include <Adafruit_AS7341.h>

// ------ OLED 所需的函式庫與設定 ------
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED 螢幕寬度像素
#define SCREEN_HEIGHT 64 // OLED 螢幕高度像素
#define OLED_RESET    -1 // 取消重設引腳（與 ESP32 共用重設）
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
// -----------------------------------------

// 定義 Pin 腳
const int ledPin = 2; 
const int potPin = 32; // 可變電阻連接到 Pin 32 (ADC1)

// 1. Wi-Fi 設定
const char* ssid     = "ipta_office";
const char* password = "ipta78802";

// 2. Supabase 設定
const char* supabase_url = "https://zpebbtvmfidnjldlqitg.supabase.co/rest/v1/LightDate";
const char* supabase_key = "sb_publishable_zAGCeJzxNdwK3zj8dipvHQ_JhkjCXvY";

Adafruit_AS7341 as7341;

// 時間控制變數（使用 millis() 避免阻塞）
unsigned long delayTime = 2 * 60 * 1000; // 偵測與上傳的間隔時間（目前設定為 2 分鐘）
unsigned long lastMillis = 0;

unsigned long ledLastMillis = 0;         // 心跳燈專用計時
const unsigned long ledPeriod = 10000;   // 心跳燈總週期：10 秒
const unsigned long ledOnTime = 200;     // 心跳燈點亮時間：0.2 秒

// ------ 新增：OLED 畫面控制變數 ------
unsigned long lastOledMillis = 0;        // OLED 刷新計時
const unsigned long oledPeriod = 200;    // OLED 每 0.2 秒檢查並重新繪製一次畫面

// ------ 新增：全域光譜資料變數（儲存每分鐘採樣的結果） ------
int current_f1_raw = 0;
int current_f2_raw = 0;
int current_f3_raw = 0;
int current_f4_raw = 0;
int current_f5_raw = 0;
int current_f6_raw = 0;
int current_f7_raw = 0;
int current_f8_raw = 0;
int current_clear = 1; 
bool hasFirstReading = false;

// 宣告上傳函式原型
void uploadToSupabase(int f1, int f2, int f3, int f4, int f5, int f6, int f7, int f8, int nir, int clear_val);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // 初始化 I2C (SDA=21, SCL=22)

  // 初始化內建心跳燈 Pin 腳為輸出
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  // 初始化可變電阻 Pin 腳
  pinMode(potPin, INPUT);

  // 初始化 OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println("OLED 初始化失敗！");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0,0);
    display.println("System Initializing...");
    display.display();
  }

  // 初始化 AS7341
  if (!as7341.begin()) {
    Serial.println("找不到 AS7341 感測器，請檢查接線！");
    while (1);
  }
  
  // 連接 Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi 已連線！");
}


void loop() {
  unsigned long currentMillis = millis();

  // ==================== 需求一：Pin 2 非阻塞心跳燈 ====================
  unsigned long ledProgress = (currentMillis - ledLastMillis) % ledPeriod;
  if (ledProgress < ledOnTime) { digitalWrite(ledPin, HIGH); } else { digitalWrite(ledPin, LOW); }

  // ==================== 需求二：定時補光、偵測與上傳（1分鐘一次） ====================
  if (currentMillis - lastMillis >= delayTime || lastMillis == 0) {
    lastMillis = currentMillis;

    Serial.println("準備偵測環境...點亮 AS7341 LED 補光");
    as7341.enableLED(true);
    delay(500); 

    uint16_t readings[12];
    if (as7341.readAllChannels(readings)) {
      
      // 更新所有通道的原始數值到全域變數
      current_f1_raw = readings[0];
      current_f2_raw = readings[1];
      current_f3_raw = readings[2];
      current_f4_raw = readings[3]; 
      current_f5_raw = readings[4]; 
      current_f6_raw = readings[5];
      current_f7_raw = readings[6];
      current_f8_raw = readings[7];
      current_clear  = readings[8];   
      if (current_clear == 0) current_clear = 1; 
      int nir = readings[9];
      hasFirstReading = true;

      // 讀取當前旋鈕與明度因子
      int potValue = analogRead(potPin);
      float greenWeight = potValue / 4095.0;
      float brightnessFactor = current_clear / 3000.0;
      if (brightnessFactor > 1.0) brightnessFactor = 1.0;

      // 計算上傳值（只有 F4、F5 同時受旋鈕與明度影響，其餘僅受環境明度影響）
      int upload_f1 = (int)(current_f1_raw * brightnessFactor);
      int upload_f2 = (int)(current_f2_raw * brightnessFactor);
      int upload_f3 = (int)(current_f3_raw * brightnessFactor);
      int upload_f4 = (int)(current_f4_raw * greenWeight * brightnessFactor);
      int upload_f5 = (int)(current_f5_raw * greenWeight * brightnessFactor);
      int upload_f6 = (int)(current_f6_raw * brightnessFactor);
      int upload_f7 = (int)(current_f7_raw * brightnessFactor);
      int upload_f8 = (int)(current_f8_raw * brightnessFactor);

      as7341.enableLED(false);

      if (WiFi.status() == WL_CONNECTED) {
        uploadToSupabase(upload_f1, upload_f2, upload_f3, upload_f4, upload_f5, upload_f6, upload_f7, upload_f8, nir, current_clear);
      }
    } else {
      as7341.enableLED(false);
      Serial.println("感測器讀取失敗！");
    }
  }

  // ==================== 需求三：OLED 高頻率即時重新繪製（200毫秒一次） ====================
  if (currentMillis - lastOledMillis >= oledPeriod) {
    lastOledMillis = currentMillis;

    // 即時計算權重與倒數
    int potValue = analogRead(potPin);
    float greenWeight = potValue / 4095.0;

    long timeRemaining = delayTime - (currentMillis - lastMillis);
    if (timeRemaining < 0) timeRemaining = 0;
    int secondsLeft = timeRemaining / 1000;

    float brightnessFactor = current_clear / 3000.0; 
    if (brightnessFactor > 1.0) brightnessFactor = 1.0;

    // 即時計算所有通道的校正後數值
    int c_f1 = (int)(current_f1_raw * brightnessFactor);
    int c_f2 = (int)(current_f2_raw * brightnessFactor);
    int c_f3 = (int)(current_f3_raw * brightnessFactor);
    int c_f4 = (int)(current_f4_raw * greenWeight * brightnessFactor); // 綠光彩度+明度
    int c_f5 = (int)(current_f5_raw * greenWeight * brightnessFactor); // 綠光彩度+明度
    int c_f6 = (int)(current_f6_raw * brightnessFactor);
    int c_f7 = (int)(current_f7_raw * brightnessFactor);
    int c_f8 = (int)(current_f8_raw * brightnessFactor);

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    
    // 1. 狀態與倒數
    display.setCursor(0, 0);
    display.printf("Next Scan in: %ds\n", secondsLeft);
    display.println("---------------------");

    // 2. 即時控制參數
    display.printf("Sat:%.2f Bri: %d\n" , greenWeight, current_clear);
    display.println("---------------------");
    
    // 3. 顯示 f1-f8 校正後數據（無項目名稱，僅逗號分隔）
    if (hasFirstReading) {
      // F1 到 F8 顯示在第一行
      display.printf("%d,%d,%d,%d,%d,%d,%d,%d\n", c_f1, c_f2, c_f3, c_f4, c_f5, c_f6, c_f7, c_f8);
    } else {
      display.println("Waiting Data...");
    }
    
    display.display(); 
  }
}

// ------ 補回：實際處理上傳 Supabase 的功能函式 ------
void uploadToSupabase(int f1, int f2, int f3, int f4, int f5, int f6, int f7, int f8, int nir, int clear_val) {
  HTTPClient http;
  WiFiClientSecure client; 
  client.setInsecure();    

  http.begin(client, supabase_url);
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);

  String jsonBody = "{";
  jsonBody += "\"f1_415nm\":" + String(f1) + ",";
  jsonBody += "\"f2_445nm\":" + String(f2) + ",";
  jsonBody += "\"f3_480nm\":" + String(f3) + ",";
  jsonBody += "\"f4_515nm\":" + String(f4) + ","; 
  jsonBody += "\"f5_555nm\":" + String(f5) + ","; 
  jsonBody += "\"f6_590nm\":" + String(f6) + ",";
  jsonBody += "\"f7_630nm\":" + String(f7) + ",";
  jsonBody += "\"f8_680nm\":" + String(f8) + ",";
  jsonBody += "\"nir_910nm\":" + String(nir) + ",";
  jsonBody += "\"clear_luminous\":" + String(clear_val);
  jsonBody += "}";

  int httpResponseCode = http.POST(jsonBody);

  if (httpResponseCode > 0) {
    Serial.println("Supabase 回應代碼: " + String(httpResponseCode));
  } else {
    Serial.print("傳送失敗，錯誤代碼: ");
    Serial.println(httpResponseCode);
  }

  http.end(); 
}