import { PLATFORM_NAME, OHMCONNECTURL } from './settings';
import {AccessoryPlugin, API, HAP, Logging, AccessoryConfig, Service } from 'homebridge';
import axios from 'axios';
import xml2js from 'xml2js';


let hap: HAP;

export = (api: API) => {
  hap = api.hap;

  api.registerAccessory(PLATFORM_NAME, OhmConnectAccessory);
};

class OhmConnectAccessory implements AccessoryPlugin {

  private readonly sensorService: Service;
  private readonly infoService: Service;
  private statusUrl: string;

  constructor(private readonly log: Logging, private readonly config: AccessoryConfig, private readonly api: API) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.statusUrl = OHMCONNECTURL + this.config.ohmConnectId;

    // create a new Contact Sensor service
    this.sensorService = new hap.Service.ContactSensor(this.config.name);


    // create handlers for required characteristics
    this.sensorService.getCharacteristic(hap.Characteristic.ContactSensorState)
      .onGet(this.handleContactSensorStateGet.bind(this));

    this.infoService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Ohm Connect')
      .setCharacteristic(hap.Characteristic.Model, 'Active Ohm Hour');

    setInterval(() => {

      this.handleContactSensorStateGet();

    }, this.config.refreshMinutes * 60 * 1000);

  }

  /**
 * Handle requests to get the current value of the "Contact Sensor State" characteristic
 */
  async handleContactSensorStateGet() {
    this.log.debug('Triggered GET ContactSensorState');

    // Default Contact Sensor to CLOSED
    let currentValue = hap.Characteristic.ContactSensorState.CONTACT_DETECTED;

    const parser = new xml2js.Parser();

    await axios.get(this.statusUrl)
      .then((response) => {
        // handle success
        this.log.debug('Full Response:\n%s', response.data);
        parser.parseString(response.data, (err, result) => {
          this.log.debug('Parsed result: %s', result.ohmhour.active[0]);
          if (result.ohmhour.active[0] === 'False') {
            this.log.debug('Setting Contact Sensor to CLOSED');
            currentValue = hap.Characteristic.ContactSensorState.CONTACT_DETECTED;
          } else if (result.ohmhour.active[0] === 'True') {
            this.log.debug('Setting Contact Sensor to OPEN');
            currentValue = hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
          } else {
            this.log.info('Received unexpected value %s', result.ohmhour.active[0]);
          }
        });
      })
      .catch((error) => {
        // handle error
        this.log.debug(error);
      })
      .then(() => {
        // always executed
      });

    return currentValue;
  }

  getServices(): Service[] {
    return [ this.infoService, this.sensorService ];
  }
}