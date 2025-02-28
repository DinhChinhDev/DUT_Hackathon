#include <Wire.h>
#include <ESP8266Firebase.h>
#include <ESP8266WiFi.h>
#include <time.h>

#define _SSID "thanhvjp"          // Your WiFi SSID
#define _PASSWORD "13579111315"      // Your WiFi Password
#define REFERENCE_URL "https://electratech-87423-default-rtdb.asia-southeast1.firebasedatabase.app/"  // Your Firebase project reference url

Firebase firebase(REFERENCE_URL);
int COUNTTAMBAY = 0;

char currentStatus;
int socket1;
int socket2;
int socket3;

String URL = "";

int socket1State = D0;
int socket3State = D6;
int socket2State = D3;

int timezone = 7 * 3600;
int dst = 0;

float power1 = 0;
float power2 = 0;
float power3 = 0;

int tempTime = 0;

void setup() {
  Serial.begin(9600); /* begin serial for debug */

  Wire.begin(D1, D2); /* join i2c bus with SDA=D1 and SCL=D2 of NodeMCU */

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(1000);

  // Connect to WiFi
  WiFi.begin(_SSID, _PASSWORD);
  Serial.println(millis());
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("-");
  }
  Serial.println("PRE");

  // Connect to time zone
  configTime(timezone, dst, "pool.ntp.org","time.nist.gov");
  while(!time(nullptr)){
     Serial.print("*");
     delay(300);
  }

  pinMode(socket1State, OUTPUT);
  pinMode(socket2State, OUTPUT);
  pinMode(socket3State, OUTPUT);
}
 
void loop() {
  // Get data about change of status
  String data = firebase.getString("PowerProviders/thanhvjp1/StatusFromWeb");
  

  // process data
  int countStatus = 1;
  
  for(int i = 0; i < data.length(); i++) {
    char c = data.charAt(i);
    
    if(data.charAt(i - 1) == '.') {
      switch (countStatus) {
        case 1: 
          if(c == 't') {
            digitalWrite(socket1State, HIGH);
          } else {
            digitalWrite(socket1State, LOW);
          }
          break;
        case 2: 
          if(c == 't') {
            digitalWrite(socket2State, LOW);
          } else {
            digitalWrite(socket2State, HIGH);
          }
          break;
        case 3: 
          if(c == 't') {
            digitalWrite(socket3State, LOW);
          } else {
            digitalWrite(socket3State, HIGH);
          }
          break;
      }
      countStatus++ ;
    }
  }

  //Get data on off
  String TheSocketStatus = "";

  if(digitalRead(socket1State) == 1) {
    TheSocketStatus += "1.t ";
  } else {
    TheSocketStatus += "1.f ";
  }

  if(digitalRead(socket2State) == 0) {
    TheSocketStatus += "2.t ";
  } else {
    TheSocketStatus += "2.f ";
  }
  
  if(digitalRead(socket1State) == 0) {
    TheSocketStatus += "3.t";
  } else {
    TheSocketStatus += "3.f";
  }

  Serial.println(socket1State);

  firebase.setString("PowerProviders/thanhvjp1/Status", TheSocketStatus);


  //get the data from arduino
  Serial.println("Begin request");
  Wire.requestFrom(8, 24); 
  String str = "";
  while(Wire.available()) {
    char c = Wire.read();
    str += String(c);
  }
  Serial.println(str);


  // get the time and url
  time_t now = time(nullptr);
  struct tm* p_tm = localtime(&now);

  String day = String(p_tm->tm_mday) + "-" + String(p_tm->tm_mon + 1) + "-" + String(p_tm->tm_year + 1900);
  String hour = String(p_tm->tm_hour) + "h-" + String(p_tm->tm_hour + 1) + "h";
  String URLToFireBase = "PowerProviders/thanhvjp1/ElectricAmount/" + String(day)
        + "/" + String(hour);
  int sec = p_tm->tm_sec;
  int time = calculateTime(tempTime, sec);
  tempTime = sec;
  

  // process string
  int temp = 0;
  int count = 0;
  String myStr = "";
  
  for(int i = 0; i < str.length(); i++) {
    char c = str.charAt(i);
    
    if(count == 1) {
      myStr += c; 
    }

    if(c == ',') {
      count = 1;
      temp++;
      myStr = "";
    }
    
    if(str.charAt(i + 1) == 'k') {
      switch (temp) {
        case 1: 
          power1 += (myStr.toFloat() * 220 * time);
          break;
        case 2: 
          power2 += (myStr.toFloat() * 220 * time);
          break;
        case 3: 
          power3 += (myStr.toFloat() * 220 * time);
          break;
      }
      count = 0;
    }
  }

  // Send to firebase Ws
  String passToFirebase = String("1,") + String(power1) + String("Ws ") +
  String("2,") + String(power2) + String("Ws ") +
  String("3,") + String(power3) + String("Ws ");
  firebase.setString(URLToFireBase, passToFirebase);
}

int calculateTime(int firstSec, int secondSec) {
  if(firstSec > secondSec) {
    return(60 - (firstSec - secondSec));
  } else {
    return(secondSec - firstSec);
  }
}