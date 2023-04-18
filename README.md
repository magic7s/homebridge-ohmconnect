# Homebridge Ohm Connect

Homebridge plugin for [Ohm Connect](https://www.ohmconnect.com/) Status

Sign-Up with my referral code, it's free and you can get free stuff. -> [https://ohm.co/brad-8](https://ohm.co/brad-8)

## What is it?
OhmConnect monitors real-time conditions on the electricity grid. When dirty and unsustainable power plants turn on, our users receive a notification to save energy. By saving energy at that time, California does not have to turn on additional power plants and California’s energy authorities pay you for that.

This plugin will monitor your location's [Ohm Hour](https://www.ohmconnect.com/how-it-works#ohmhours-101) and publish a Contact Sensor that will OPEN when you are requested to save energy. 

## What will you need?
After creating an account, you will need to retrieve your OhmConnect ID. You can find your OhmConnect ID on the [OhmConnect API settings page](https://login.ohmconnect.com/api/v2/settings). It’s the string after the last / in the URL, e.g., for the URL `https://login.ohmconnect.com/verify-ohm-hour/AbCd1e` your ID is AbCd1e."

## Example Config
```
"accessories": [
        {
            "name": "OhmConnect",
            "ohmConnectId": "AbCd1e",
            "refreshMinutes": 5,
            "accessory": "OhmConnect"
        }
    ],
```