import { CarrierGatewayInfo } from '../types';

export const GLOBAL_CARRIERS: CarrierGatewayInfo[] = [
  {
    carrier: 'Verizon Wireless',
    country: 'United States',
    smsGateway: 'vtext.com',
    mmsGateway: 'vzwpix.com',
    charLimit: 140,
    notes: 'Primary US carrier. Strict reverse DNS verification on port 25.'
  },
  {
    carrier: 'AT&T Mobility',
    country: 'United States',
    smsGateway: 'txt.att.net',
    mmsGateway: 'mms.att.net',
    charLimit: 160,
    notes: 'Requires matching PTR record. Automatically breaks long messages into parts.'
  },
  {
    carrier: 'T-Mobile US',
    country: 'United States',
    smsGateway: 'tmomail.net',
    mmsGateway: 'tmomail.net',
    charLimit: 160,
    notes: 'Combined SMS/MMS gateway. Supports direct plain-text and attachments.'
  },
  {
    carrier: 'Sprint (T-Mobile)',
    country: 'United States',
    smsGateway: 'messaging.sprintpcs.com',
    mmsGateway: 'pm.sprint.com',
    charLimit: 160,
    notes: 'Legacy Sprint routes mapped to modern T-Mobile core.'
  },
  {
    carrier: 'Google Fi',
    country: 'United States',
    smsGateway: 'msg.fi.google.com',
    mmsGateway: 'msg.fi.google.com',
    charLimit: 160,
    notes: 'Routes via T-Mobile / US Cellular partner network.'
  },
  {
    carrier: 'US Cellular',
    country: 'United States',
    smsGateway: 'email.uscc.net',
    mmsGateway: 'mms.uscc.net',
    charLimit: 160,
    notes: 'Midwest and regional carrier gateway.'
  },
  {
    carrier: 'Boost Mobile',
    country: 'United States',
    smsGateway: 'sms.myboostmobile.com',
    mmsGateway: 'myboostmobile.com',
    charLimit: 160,
    notes: 'Dish Wireless network MVNO.'
  },
  {
    carrier: 'Cricket Wireless',
    country: 'United States',
    smsGateway: 'sms.cricketwireless.net',
    mmsGateway: 'mms.cricketwireless.net',
    charLimit: 160,
    notes: 'Runs on AT&T network infrastructure.'
  },
  {
    carrier: 'Metro by T-Mobile',
    country: 'United States',
    smsGateway: 'mymetropcs.com',
    mmsGateway: 'mymetropcs.com',
    charLimit: 160,
    notes: 'Direct T-Mobile subsidiary.'
  },
  {
    carrier: 'Mint Mobile',
    country: 'United States',
    smsGateway: 'mailmymobile.net',
    mmsGateway: 'mailmymobile.net',
    charLimit: 160,
    notes: 'T-Mobile network MVNO.'
  },
  {
    carrier: 'Consumer Cellular',
    country: 'United States',
    smsGateway: 'mailmymobile.net',
    mmsGateway: 'mailmymobile.net',
    charLimit: 160,
    notes: 'Standard MVNO email router.'
  },
  {
    carrier: 'Ting Mobile',
    country: 'United States',
    smsGateway: 'message.ting.com',
    mmsGateway: 'message.ting.com',
    charLimit: 160,
    notes: 'Requires account email authorization on some lines.'
  },
  {
    carrier: 'Rogers Wireless',
    country: 'Canada',
    smsGateway: 'pcs.rogers.com',
    mmsGateway: 'mms.rogers.com',
    charLimit: 140,
    notes: 'Primary Canadian carrier.'
  },
  {
    carrier: 'Bell Mobility',
    country: 'Canada',
    smsGateway: 'txt.bell.ca',
    mmsGateway: 'txt.bell.ca',
    charLimit: 140,
    notes: 'National Canadian network.'
  },
  {
    carrier: 'Telus Mobility',
    country: 'Canada',
    smsGateway: 'msg.telus.com',
    mmsGateway: 'mms.telus.com',
    charLimit: 140,
    notes: 'Western and Eastern Canada carrier network.'
  },
  {
    carrier: 'Fido',
    country: 'Canada',
    smsGateway: 'fido.ca',
    mmsGateway: 'mms.fido.ca',
    charLimit: 140,
    notes: 'Rogers subsidiary.'
  },
  {
    carrier: 'Virgin Plus Canada',
    country: 'Canada',
    smsGateway: 'vmobile.ca',
    mmsGateway: 'vmobile.ca',
    charLimit: 140,
    notes: 'Bell subsidiary.'
  },
  {
    carrier: 'O2 UK',
    country: 'United Kingdom',
    smsGateway: 'o2imail.co.uk',
    mmsGateway: 'mediamessaging.o2.co.uk',
    charLimit: 160,
    notes: 'Virgin Media O2 network.'
  },
  {
    carrier: 'Vodafone UK',
    country: 'United Kingdom',
    smsGateway: 'vodafone.net',
    mmsGateway: 'vodafone.net',
    charLimit: 160,
    notes: 'Enterprise account registration required on select prefixes.'
  },
  {
    carrier: 'EE (Everything Everywhere)',
    country: 'United Kingdom',
    smsGateway: 'ee.co.uk',
    mmsGateway: 'mms.ee.co.uk',
    charLimit: 160,
    notes: 'BT Group mobile network.'
  },
  {
    carrier: 'Direct Linux SMTP Virtual',
    country: 'Global / Linux',
    smsGateway: 'sms.customlinux.org',
    mmsGateway: 'sms.customlinux.org',
    charLimit: 918,
    notes: 'Direct Port 25 RFC5321 virtual DID relay.'
  }
];
