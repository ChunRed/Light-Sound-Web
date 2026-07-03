#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h> // 整合：安全連線庫
#include <Wire.h>
#include <Adafruit_AS7341.h>

// 定義心跳燈 Pin 腳
const int ledPin = 2; 

// 1. Wi-Fi 設定
const char* ssid     = "ipta_office";
const char* password = "ipta78802";

// 2. Supabase 設定
const char* supabase_url = "https://zpebbtvmfidnjldlqitg.supabase.co/rest/v1/LightDate";
const char* supabase_key = "sb_publishable_zAGCeJzxNdwK3zj8dipvHQ_JhkjCXvY";

Adafruit_AS7341 as7341;

// 時間控制變數（使用 millis() 避免阻塞）
unsigned long delayTime = 1 * 60 * 1000; // 偵測與上傳的間隔時間（每分鐘偵測與生成一次）
unsigned long lastMillis = 0;

unsigned long ledLastMillis = 0;         // 心跳燈專用計時
const unsigned long ledPeriod = 10000;   // 心跳燈總週期：10 秒 (10000 毫秒)
const unsigned long ledOnTime = 200;     // 心跳燈點亮時間：0.2 秒 (200 毫秒)

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // 初始化 I2C (SDA=21, SCL=22)

  // 初始化內建心跳燈 Pin 腳為輸出
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

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
  // 計算目前處於 10 秒週期中的哪一個毫秒
  unsigned long ledProgress = (currentMillis - ledLastMillis) % ledPeriod;
  
  if (ledProgress < ledOnTime) {
    digitalWrite(ledPin, HIGH); // 週期內的前 0.2 秒：點亮
  } else {
    digitalWrite(ledPin, LOW);  // 剩下的 9.8 秒：熄滅
  }

  // ==================== 需求二：定時補光、偵測與上傳 ====================
  if (currentMillis - lastMillis >= delayTime || lastMillis == 0) {
    lastMillis = currentMillis;

    Serial.println("準備偵測環境...點亮 AS7341 LED 補光");
    // 1. 偵測前點亮 AS7341 的內建 LED
    as7341.enableLED(true);
    
    // 2. 讓 LED 持續亮約 0.5 秒 (500毫秒) 照亮環境，同時讓感測器接收穩定
    delay(500); 

    // 3. 讀取光譜頻道數值
    uint16_t readings[12];
    if (as7341.readAllChannels(readings)) {
      
      int f1 = readings[0];
      int f2 = readings[1];
      int f3 = readings[2];
      int f4 = readings[3];
      int f5 = readings[4];
      int f6 = readings[5];
      int f7 = readings[6];
      int f8 = readings[7];
      int clear_val = readings[8];
      int nir = readings[9];

      Serial.printf("讀取成功(補光狀態)！F5(555nm綠光): %d, Clear(總光量): %d\n", f5, clear_val);

      // 4. 讀取完畢後立刻關閉 AS7341 LED
      as7341.enableLED(false);
      Serial.println("關閉 AS7341 LED");

      // 如果 Wi-Fi 正常，將資料上傳到 Supabase
      if (WiFi.status() == WL_CONNECTED) {
        uploadToSupabase(f1, f2, f3, f4, f5, f6, f7, f8, nir, clear_val);
      }
    } else {
      // 如果讀取失敗，也別忘了把 LED 關掉避免它一直發熱
      as7341.enableLED(false);
      Serial.println("感測器讀取失敗！");
    }
  }
}

void uploadToSupabase(int f1, int f2, int f3, int f4, int f5, int f6, int f7, int f8, int nir, int clear_val) {
  HTTPClient http;
  WiFiClientSecure client; // 整合：安全連線客戶端
  client.setInsecure();    // 整合：忽略 SSL 憑證檢查

  // 開始 HTTP 連線
  http.begin(client, supabase_url);
  
  // 設定 Supabase 所需的 Headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);

  // 建立 JSON 字串
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

  // 發送 POST 請求
  int httpResponseCode = http.POST(jsonBody);

  if (httpResponseCode > 0) {
    Serial.println("Supabase 回應代碼: " + String(httpResponseCode));
  } else {
    Serial.print("傳送失敗，錯誤代碼: ");
    Serial.println(httpResponseCode);
  }

  http.end(); // 關閉連線
}