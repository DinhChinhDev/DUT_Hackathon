from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
import json
import os
import logging
import firebase_admin
from firebase_admin import credentials, db
logging.basicConfig(level=logging.DEBUG, filename='myapp.log', filemode='w')
logger = logging.getLogger()


from openai import OpenAI

client = OpenAI(api_key="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")

example_json2 = {
"times_stop" : [
{"day_of_week" : "Monday",
"devices" : [
        {"device_id" : 1, "time_stop" : ["1h-2h","2h-5h","8h-9h"] },
        {"device_id" : 2, "time_stop" : ["1h-2h","2h-8h","10h-24h"] },
        {"device_id" : 3, "time_stop" : ["0h-24h"] }
]},
]
}

example_json = {
   
  "times_stop": 
    {
        
      "1": {
        "day_of_week": "Monday",
        "devices": [
          {"device_id": 1, "time_stop": ["1h-2h", "2h-5h", "8h-9h"]},
          {"device_id": 2, "time_stop": ["1h-2h", "2h-8h", "10h-24h"]},
          {"device_id": 3, "time_stop": ["0h-24h"]}
        ]
      },
      "2": {
        "day_of_week": "Tuesday",
        "devices": [
          {"device_id": 1, "time_stop": ["1h-2h", "2h-5h", "8h-9h"]},
          {"device_id": 2, "time_stop": ["1h-2h", "2h-8h", "10h-24h"]},
          {"device_id": 3, "time_stop": ["0h-24h"]}
        ]
      }
    }
  
}


# Initialize the Firebase app with your project's credentials
cred = credentials.Certificate('electratech-87423-firebase-adminsdk-zvtt5-d6107915e0.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://electratech-87423-default-rtdb.asia-southeast1.firebasedatabase.app/'
})
def get_data(outlet_name):
    # Get a database reference
    
    print(outlet_name)
    ref = db.reference(f'PowerProviders/{outlet_name}/ElectricAmount')

    # Read the data
    return ref.get()

def generate_suggestions(prompt):
    

    completion = client.chat.completions.create(
  model="gpt-3.5-turbo-1106",
  response_format={ "type": "json_object" },
  messages=[
    {"role": "system", "content": "You are a helpful assistant, Provide valid JSON output.The Data input schema : {'date': {time_use: device_id, kwh}} similar this '17-1-2024': {'0h-1h': '1, 1.4kWh 2, 0.5kWh 3, 0.6kWh', '1h-2h': '1, 0.1kWh 2, 0.2kWh 3, 0kWh'}  . The return data schema should be like this example:"+ json.dumps(example_json)},
    {"role": "user", "content": prompt}
  ]
)
    finish_reason = completion.choices[0].finish_reason
    if finish_reason == "stop":
        
        data = completion.choices[0].message.content
        print(data)
        times_stop = json.loads(data)
        for key, value in times_stop['times_stop'].items():
          day_of_week_value = value['day_of_week']
          devices_value = value['devices']
          print(str(key) + ": " + str(day_of_week_value) + " : " + str(devices_value))
        return times_stop
    else:
        print("Error provide more tokens")
        return {"Error":"provide more tokens"}
 
# I give you my electricity usage habits at times during a day from Monday to Sunday. 
@api_view(['GET', 'POST'])
def chatbot(request):
    if request.method == 'GET':
        return Response({"message": "Hello"})

    if request.method == 'POST':
        outlet_name = request.data.get('outlet_name', '')
        print(outlet_name)
        time2 = get_data(outlet_name)
        print(time2)
        time = json.dumps(time2)
        print(time)
        
        if time:
            
            
            prompt = time+ """Divide 24h into 23 part (from 0h to 24h).time_stop is the time to turn off electricity for each devices (Important - combine the time if it continuous).
            devices is the list of devices. device_id is the id of device. time use is the time to use electricity for each devices. kwh is the amount of electricity used for each devices.
            what times to turn off electricity for each devices.Do it for all day of the week from monday to sunday.
            Important: Reccommend ALL possible as many as you can times from 0h to 24h to turn off electricity devices for each devices(kwh too low).
            Convert date to day_of_week. 
             Provide result in the JSON format."""
            json_data = generate_suggestions(prompt)
            jsonName = outlet_name
            print (jsonName)
            #https://electratech-87423.firebaseio.com/PowerProviders/thanhvjp/.json
            if  jsonName != "":
              requests.put(url=f"https://electratech-87423-default-rtdb.asia-southeast1.firebasedatabase.app/Recommend/{jsonName}.json", json= json_data)
            # json_data = generate_suggestions(prompt)
             
            return Response("json_data")


       
