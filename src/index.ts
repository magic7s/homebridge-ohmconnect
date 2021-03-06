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

    this.infoService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Ohm Connect')
      .setCharacteristic(hap.Characteristic.Model, 'Active Ohm Hour')
      .setCharacteristic(hap.Characteristic.SerialNumber, this.config.ohmConnectId);

    // Check if missing OhmConnectId in config before attempting to fetch status.
    if (!('ohmConnectId' in this.config) || this.config.ohmConnectId === '') {
      this.log.error('ohmConnectId missing or blank, check config.json');
      return;
    }

    // create handlers for required characteristics
    this.sensorService.getCharacteristic(hap.Characteristic.ContactSensorState)
      .onGet(this.handleContactSensorStateGet.bind(this));

    setInterval(() => {

      this.handleContactSensorStateGet();

    }, this.config.refreshMinutes * 60 * 1000);

  }

  /**
 * Handle requests to get the current value of the "Contact Sensor State" characteristic
 */
  async handleContactSensorStateGet() {
    this.log.debug('Triggered GET ContactSensorState');
    const previousValue = this.sensorService.getCharacteristic(hap.Characteristic.ContactSensorState).value;
    this.log.debug('Previous sensor state value of %d', this.sensorService.getCharacteristic(hap.Characteristic.ContactSensorState).value);

    // Default Contact Sensor to CLOSED
    let currentValue = hap.Characteristic.ContactSensorState.CONTACT_DETECTED;

    const parser = new xml2js.Parser();

    await axios.get(this.statusUrl)
      .then((response) => {
        // handle success
        this.log.debug('Full Response:\n%s', response.data);
        parser.parseString(response.data, (err, result) => {
          if (err || !('ohmhour' in result) || ('error' in result.ohmhour) || !('active' in result.ohmhour)) {
            this.log.error('Error parsing result: %s', (err || result.ohmhour.error[0]|| 'Unknown, enable debug'));
            return;
          }
          currentValue = this.xmlResponseProcess(result);
        });
      })
      .catch((error) => {
        // handle error
        this.log.error('Error while connecting to web service: %s', error);
      });

    if (currentValue !== previousValue) {
      this.log.info('Change in contact sensor state, new value is %d', currentValue);
    }
    this.log.debug('Returning value of %d', currentValue);
    return currentValue;
  }

  /**
 * Process xml output from api response
 */
  private xmlResponseProcess(result) {
    let value;
    this.log.debug('Parsed result: %s', result.ohmhour.active[0]);
    switch (result.ohmhour.active[0]) {
      case 'False':
        this.log.debug('Setting Contact Sensor to CLOSED');
        value = hap.Characteristic.ContactSensorState.CONTACT_DETECTED;
        break;
      case 'True':
        this.log.debug('Setting Contact Sensor to OPEN');
        value = hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
        break;
      default:
        this.log.info('Received unexpected value %s', result.ohmhour.active[0]);
        break;
    }
    return value;
  }

  getServices(): Service[] {
    return [ this.infoService, this.sensorService ];
  }
}