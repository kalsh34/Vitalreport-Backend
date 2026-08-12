import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import Permission from '../models/Permission.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import Guard from '../models/Guard.js';
import Site from '../models/Site.js';
import Post from '../models/Post.js';
import Shift from '../models/Shift.js';
import PatrolRoute from '../models/PatrolRoute.js';
import PatrolCheckpoint from '../models/PatrolCheckpoint.js';
import PatrolSchedule from '../models/PatrolSchedule.js';
import GuardLocation from '../models/GuardLocation.js';
import PatrolEvent from '../models/PatrolEvent.js';
import GuardReport from '../models/GuardReport.js';
import Incident from '../models/Incident.js';
import AESEvent from '../models/AESEvent.js';
import RadioCommunication from '../models/RadioCommunication.js';
import ControlRoomLog from '../models/ControlRoomLog.js';
import DailyReport from '../models/DailyReport.js';
import KPISnapshot from '../models/KPISnapshot.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { PERMISSIONS, ROLES } from './constants.js';

dotenv.config();

const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
const yesterdayEnd = new Date(yesterdayStart.getTime() + 24 * 60 * 60 * 1000);

const ids = {
  permissions: {},
  roles: {},
  users: {},
  guards: {},
  sites: {},
  posts: {},
  shifts: {},
  patrolRoutes: {},
  patrolCheckpoints: {},
};

const log = (msg) => console.log(`[SEED] ${msg}`);

const seedPermissions = async () => {
  log('Creating permissions...');
  const created = [];
  for (const name of PERMISSIONS) {
    const doc = await Permission.findOneAndUpdate(
      { name },
      { name, description: name.replace(/_/g, ' ').toLowerCase() },
      { upsert: true, new: true }
    );
    ids.permissions[name] = doc._id;
    created.push(doc);
  }
  log(`Created ${created.length} permissions`);
  return created;
};

const seedRoles = async (allPermissions) => {
  log('Creating roles...');
  const p = ids.permissions;

  const operationalPerms = [
    p.VIEW_GUARDS, p.MANAGE_GUARDS, p.VIEW_SITES, p.MANAGE_SITES,
    p.VIEW_POSTS, p.MANAGE_POSTS, p.VIEW_SHIFTS, p.MANAGE_SHIFTS,
    p.VIEW_PATROLS, p.MANAGE_PATROLS, p.VIEW_GPS_TRACKING, p.MANAGE_GPS_TRACKING,
    p.VIEW_RADIO_COMMUNICATIONS, p.MANAGE_RADIO_COMMUNICATIONS,
    p.VIEW_CONTROL_ROOM_LOGS, p.MANAGE_CONTROL_ROOM_LOGS,
    p.VIEW_INCIDENTS, p.CREATE_INCIDENTS, p.EDIT_INCIDENTS, p.ESCALATE_INCIDENTS, p.RESOLVE_INCIDENTS,
    p.VIEW_AES_EVENTS, p.MANAGE_AES_EVENTS, p.ACKNOWLEDGE_AES_EVENTS,
    p.VIEW_GUARD_REPORTS, p.CREATE_GUARD_REPORTS, p.EDIT_GUARD_REPORTS,
    p.APPROVE_GUARD_REPORTS,
    p.VIEW_DAILY_REPORTS, p.CREATE_DAILY_REPORTS, p.APPROVE_DAILY_REPORTS,
    p.VIEW_WEEKLY_REPORTS, p.CREATE_WEEKLY_REPORTS, p.APPROVE_WEEKLY_REPORTS,
    p.VIEW_MONTHLY_REPORTS, p.CREATE_MONTHLY_REPORTS, p.APPROVE_MONTHLY_REPORTS,
    p.PUBLISH_REPORTS, p.VIEW_KPI_DASHBOARDS, p.VIEW_NOTIFICATIONS, p.MANAGE_NOTIFICATIONS,
  ].filter(Boolean);

  const viewOpsPerms = [
    p.VIEW_GUARDS, p.VIEW_SITES, p.VIEW_POSTS, p.VIEW_SHIFTS,
    p.VIEW_PATROLS, p.VIEW_GPS_TRACKING,
    p.VIEW_INCIDENTS, p.VIEW_GUARD_REPORTS, p.VIEW_RADIO_COMMUNICATIONS,
    p.VIEW_CONTROL_ROOM_LOGS, p.VIEW_AES_EVENTS, p.VIEW_NOTIFICATIONS,
  ].filter(Boolean);

  const reportingPerms = [
    p.VIEW_DAILY_REPORTS, p.VIEW_WEEKLY_REPORTS, p.VIEW_MONTHLY_REPORTS,
    p.VIEW_KPI_DASHBOARDS, p.VIEW_GUARD_REPORTS, p.EXPORT_REPORTS, p.VIEW_ANALYTICS,
  ].filter(Boolean);

  const allPermIds = allPermissions.map((pp) => pp._id);

  const roleDefinitions = {
    [ROLES.SUPER_ADMIN]: allPermIds,
    [ROLES.CONTROL_ROOM_ADMIN]: operationalPerms,
    [ROLES.CONTROL_ROOM_OPERATOR]: [
      p.VIEW_GUARDS, p.VIEW_SITES, p.VIEW_POSTS, p.VIEW_SHIFTS,
      p.VIEW_AES_EVENTS, p.MANAGE_AES_EVENTS, p.ACKNOWLEDGE_AES_EVENTS,
      p.VIEW_RADIO_COMMUNICATIONS, p.MANAGE_RADIO_COMMUNICATIONS,
      p.VIEW_CONTROL_ROOM_LOGS, p.MANAGE_CONTROL_ROOM_LOGS,
      p.VIEW_INCIDENTS, p.CREATE_INCIDENTS, p.ESCALATE_INCIDENTS,
      p.VIEW_GUARD_REPORTS, p.VIEW_NOTIFICATIONS, p.VIEW_PATROLS,
      p.VIEW_GPS_TRACKING,
    ].filter(Boolean),
    [ROLES.SUPERVISOR]: [
      p.VIEW_GUARDS, p.VIEW_SITES, p.VIEW_PATROLS, p.VIEW_GPS_TRACKING,
      p.VIEW_INCIDENTS, p.VIEW_GUARD_REPORTS, p.VIEW_NOTIFICATIONS,
    ].filter(Boolean),
    [ROLES.CEO]: reportingPerms,
    [ROLES.GENERAL_MANAGER]: reportingPerms,
    [ROLES.OPERATIONS_MANAGER]: [
      ...reportingPerms, p.VIEW_INCIDENTS,
    ].filter(Boolean),
    [ROLES.SECURITY_MANAGER]: [
      ...reportingPerms, p.VIEW_INCIDENTS, p.VIEW_AES_EVENTS,
    ].filter(Boolean),
    [ROLES.REGIONAL_MANAGER]: [
      p.VIEW_DAILY_REPORTS, p.VIEW_KPI_DASHBOARDS, p.VIEW_NOTIFICATIONS,
    ].filter(Boolean),
    [ROLES.SITE_MANAGER]: [
      p.VIEW_GUARDS, p.VIEW_INCIDENTS, p.VIEW_GUARD_REPORTS,
      p.VIEW_DAILY_REPORTS, p.VIEW_NOTIFICATIONS,
    ].filter(Boolean),
    [ROLES.GUARD]: [
      p.VIEW_GUARDS, p.VIEW_SITES, p.VIEW_POSTS, p.VIEW_SHIFTS, p.VIEW_PATROLS,
      p.CREATE_GUARD_REPORTS, p.VIEW_GUARD_REPORTS, p.VIEW_NOTIFICATIONS,
    ].filter(Boolean),
  };

  for (const [roleName, permIds] of Object.entries(roleDefinitions)) {
    const doc = await Role.findOneAndUpdate(
      { name: roleName },
      { name: roleName, description: `${roleName.replace(/_/g, ' ')} role`, permissions: permIds },
      { upsert: true, new: true }
    );
    ids.roles[roleName] = doc._id;
  }
  log(`Created ${Object.keys(roleDefinitions).length} roles`);
};

const seedUsers = async () => {
  log('Creating users...');
  const hash = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@vital.com', firstName: 'Abebe', lastName: 'Kebede', role: ROLES.SUPER_ADMIN },
    { email: 'croom@vital.com', firstName: 'Tigist', lastName: 'Mulugeta', role: ROLES.CONTROL_ROOM_ADMIN },
    { email: 'operator@vital.com', firstName: 'Yonas', lastName: 'Tesfaye', role: ROLES.CONTROL_ROOM_OPERATOR },
    { email: 'supervisor@vital.com', firstName: 'Daniel', lastName: 'Bekele', role: ROLES.SUPERVISOR },
    { email: 'ceo@vital.com', firstName: 'Samuel', lastName: 'Haile', role: ROLES.CEO },
    { email: 'gm@vital.com', firstName: 'Meron', lastName: 'Adey', role: ROLES.GENERAL_MANAGER },
    { email: 'ops@vital.com', firstName: 'Kibrom', lastName: 'Gebremedhin', role: ROLES.OPERATIONS_MANAGER },
    { email: 'security@vital.com', firstName: 'Henok', lastName: 'Tadesse', role: ROLES.SECURITY_MANAGER },
    { email: 'guard1@vital.com', firstName: 'Dawit', lastName: 'Alemayehu', role: ROLES.GUARD },
    { email: 'guard2@vital.com', firstName: 'Biruk', lastName: 'Tamirat', role: ROLES.GUARD },
    { email: 'guard3@vital.com', firstName: 'Chala', lastName: 'Wakjira', role: ROLES.GUARD },
    { email: 'guard4@vital.com', firstName: 'Ephrem', lastName: 'Belayneh', role: ROLES.GUARD },
    { email: 'guard5@vital.com', firstName: 'Fikru', lastName: 'Mengistu', role: ROLES.GUARD },
    { email: 'guard6@vital.com', firstName: 'Girma', lastName: 'Sintayehu', role: ROLES.GUARD },
    { email: 'guard7@vital.com', firstName: 'Habtamu', lastName: 'Lemma', role: ROLES.GUARD },
    { email: 'guard8@vital.com', firstName: 'Indrias', lastName: 'Kassahun', role: ROLES.GUARD },
  ];

  for (const u of users) {
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      {
        email: u.email,
        password: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: ids.roles[u.role],
        phone: `+2519${String(Math.floor(10000000 + Math.random() * 89999999)).slice(0, 8)}`,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    ids.users[u.email] = doc._id;
  }
  log(`Created ${users.length} users`);
};

const seedSites = async () => {
  log('Creating sites...');
  const siteData = [
    {
      name: 'Bole Medhanealem Tower',
      clientName: 'Ethio Telecom',
      address: 'Bole Road, Addis Ababa, Ethiopia',
      latitude: 9.0054,
      longitude: 38.7636,
      geofenceRadius: 150,
    },
    {
      name: 'Merkato Commercial Center',
      clientName: 'Addis Ababa Trade Bureau',
      address: 'Merkato, Addis Ababa, Ethiopia',
      latitude: 9.0350,
      longitude: 38.7460,
      geofenceRadius: 300,
    },
    {
      name: 'Harmony Hotel',
      clientName: 'Harmony Hospitality Group',
      address: 'Bole Atlas, Addis Ababa, Ethiopia',
      latitude: 9.0120,
      longitude: 38.7580,
      geofenceRadius: 100,
    },
  ];

  for (const s of siteData) {
    const doc = await Site.findOneAndUpdate(
      { name: s.name },
      {
        ...s,
        location: { type: 'Point', coordinates: [s.longitude, s.latitude] },
        status: 'ACTIVE',
        contactPerson: 'Client Representative',
        contactPhone: '+251911000000',
      },
      { upsert: true, new: true }
    );
    ids.sites[s.name] = doc._id;
  }
  log(`Created ${siteData.length} sites`);
};

const seedPosts = async () => {
  log('Creating posts...');
  const postData = [
    { site: 'Bole Medhanealem Tower', name: 'Main Gate', description: 'Primary entrance checkpoint', sortOrder: 1 },
    { site: 'Bole Medhanealem Tower', name: 'Parking Area', description: 'Underground parking security', sortOrder: 2 },
    { site: 'Bole Medhanealem Tower', name: 'Executive Floor', description: 'Executive offices floor', sortOrder: 3 },
    { site: 'Merkato Commercial Center', name: 'Main Entrance', description: 'Primary market entrance', sortOrder: 1 },
    { site: 'Merkato Commercial Center', name: 'Warehouse', description: 'Storage warehouse area', sortOrder: 2 },
    { site: 'Merkato Commercial Center', name: 'Perimeter', description: 'Perimeter fence patrol', sortOrder: 3 },
    { site: 'Harmony Hotel', name: 'Main Gate', description: 'Hotel main entrance', sortOrder: 1 },
    { site: 'Harmony Hotel', name: 'Reception', description: 'Hotel lobby reception', sortOrder: 2 },
    { site: 'Harmony Hotel', name: 'Roof Top', description: 'Rooftop observation deck', sortOrder: 3 },
  ];

  for (const p of postData) {
    const siteId = ids.sites[p.site];
    const siteDoc = await Site.findById(siteId);
    const latOffset = (Math.random() - 0.5) * 0.002;
    const lngOffset = (Math.random() - 0.5) * 0.002;
    const doc = await Post.findOneAndUpdate(
      { site: siteId, name: p.name },
      {
        site: siteId,
        name: p.name,
        description: p.description,
        latitude: siteDoc.latitude + latOffset,
        longitude: siteDoc.longitude + lngOffset,
        sortOrder: p.sortOrder,
        status: 'ACTIVE',
      },
      { upsert: true, new: true }
    );
    ids.posts[`${p.site}:${p.name}`] = doc._id;
  }
  log(`Created ${postData.length} posts`);
};

const seedGuards = async () => {
  log('Creating guards...');
  const guardEmails = [
    'guard1@vital.com', 'guard2@vital.com', 'guard3@vital.com', 'guard4@vital.com',
    'guard5@vital.com', 'guard6@vital.com', 'guard7@vital.com', 'guard8@vital.com',
  ];
  const siteNames = ['Bole Medhanealem Tower', 'Merkato Commercial Center', 'Harmony Hotel'];
  const postKeys = [
    ['Main Gate', 'Parking Area', 'Executive Floor'],
    ['Main Entrance', 'Warehouse', 'Perimeter'],
    ['Main Gate', 'Reception', 'Roof Top'],
  ];
  const statuses = ['ON_DUTY', 'ON_DUTY', 'ON_DUTY', 'ON_DUTY', 'OFF_DUTY', 'OFF_DUTY', 'OFF_DUTY', 'OFF_DUTY'];

  for (let i = 0; i < guardEmails.length; i++) {
    const userId = ids.users[guardEmails[i]];
    const siteIdx = i % 3;
    const siteName = siteNames[siteIdx];
    const siteId = ids.sites[siteName];
    const postName = postKeys[siteIdx][i % 3];
    const postId = ids.posts[`${siteName}:${postName}`];
    const siteDoc = await Site.findById(siteId);
    const lat = siteDoc.latitude + (Math.random() - 0.5) * 0.002;
    const lng = siteDoc.longitude + (Math.random() - 0.5) * 0.002;

    const doc = await Guard.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        employeeId: `VSP-${String(i + 1).padStart(4, '0')}`,
        firstName: (await User.findById(userId)).firstName,
        lastName: (await User.findById(userId)).lastName,
        phone: `+2519${String(Math.floor(10000000 + Math.random() * 89999999)).slice(0, 8)}`,
        assignedSite: siteId,
        assignedPost: postId,
        status: statuses[i],
        device: {
          deviceId: `DEV-${uuidv4().slice(0, 8).toUpperCase()}`,
          batteryLevel: Math.floor(60 + Math.random() * 40),
          networkStatus: 'CONNECTED',
          lastSeen: new Date(),
        },
        emergencyContact: { name: 'Emergency Contact', phone: '+251911000000', relationship: 'Family' },
        isActive: true,
        lastLocation: { type: 'Point', coordinates: [lng, lat] },
      },
      { upsert: true, new: true }
    );
    ids.guards[guardEmails[i]] = doc._id;
  }
  log(`Created ${guardEmails.length} guards`);
};

const seedShifts = async () => {
  log('Creating shifts...');
  const guardEmails = Object.keys(ids.guards);
  const siteNames = ['Bole Medhanealem Tower', 'Merkato Commercial Center', 'Harmony Hotel'];
  let shiftCount = 0;

  for (let i = 0; i < guardEmails.length; i++) {
    const guardId = ids.guards[guardEmails[i]];
    const siteIdx = i % 3;
    const siteId = ids.sites[siteNames[siteIdx]];

    const yesterdayDay = await Shift.findOneAndUpdate(
      { guard: guardId, startTime: yesterdayStart },
      {
        guard: guardId,
        site: siteId,
        startTime: yesterdayStart,
        endTime: yesterdayEnd,
        status: 'COMPLETED',
        startedAt: yesterdayStart,
        endedAt: yesterdayEnd,
      },
      { upsert: true, new: true }
    );
    ids.shifts[`${guardEmails[i]}:yesterday`] = yesterdayDay._id;
    shiftCount++;

    const todayStartVal = i % 2 === 0 ? todayStart : new Date(todayStart.getTime() + 12 * 60 * 60 * 1000);
    const todayEndVal = new Date(todayStartVal.getTime() + 12 * 60 * 60 * 1000);
    const todayShift = await Shift.findOneAndUpdate(
      { guard: guardId, startTime: todayStartVal },
      {
        guard: guardId,
        site: siteId,
        startTime: todayStartVal,
        endTime: todayEndVal,
        status: 'SCHEDULED',
      },
      { upsert: true, new: true }
    );
    ids.shifts[`${guardEmails[i]}:today`] = todayShift._id;
    shiftCount++;
  }
  log(`Created ${shiftCount} shifts`);
};

const seedPatrolRoutes = async () => {
  log('Creating patrol routes...');
  const routeData = [
    { site: 'Bole Medhanealem Tower', name: 'Tower Perimeter Patrol', description: 'Full perimeter patrol around the tower', estimatedDuration: 30 },
    { site: 'Merkato Commercial Center', name: 'Market Security Patrol', description: 'Patrol through market corridors and perimeter', estimatedDuration: 45 },
    { site: 'Harmony Hotel', name: 'Hotel Grounds Patrol', description: 'Hotel grounds and facilities patrol', estimatedDuration: 25 },
  ];

  for (const r of routeData) {
    const doc = await PatrolRoute.findOneAndUpdate(
      { site: ids.sites[r.site], name: r.name },
      { ...r, site: ids.sites[r.site], status: 'ACTIVE' },
      { upsert: true, new: true }
    );
    ids.patrolRoutes[r.site] = doc._id;
  }
  log(`Created ${routeData.length} patrol routes`);
};

const seedPatrolCheckpoints = async () => {
  log('Creating patrol checkpoints...');
  const checkpointData = [
    {
      site: 'Bole Medhanealem Tower',
      checkpoints: [
        { name: 'Main Gate Checkpoint', description: 'Entry gate QR point', lat: 9.0058, lng: 38.7632 },
        { name: 'Parking Entry Checkpoint', description: 'Parking entrance QR point', lat: 9.0050, lng: 38.7640 },
        { name: 'Rear Exit Checkpoint', description: 'Rear exit QR point', lat: 9.0050, lng: 38.7630 },
        { name: 'Executive Lift Checkpoint', description: 'Executive floor lift lobby', lat: 9.0055, lng: 38.7638 },
      ],
    },
    {
      site: 'Merkato Commercial Center',
      checkpoints: [
        { name: 'Main Entrance Gate', description: 'Market main entrance', lat: 9.0355, lng: 38.7462 },
        { name: 'Warehouse Door', description: 'Warehouse side door', lat: 9.0345, lng: 38.7458 },
        { name: 'North Fence Point', description: 'North perimeter fence', lat: 9.0355, lng: 38.7455 },
        { name: 'South Corridor', description: 'South corridor checkpoint', lat: 9.0345, lng: 38.7465 },
      ],
    },
    {
      site: 'Harmony Hotel',
      checkpoints: [
        { name: 'Hotel Main Gate', description: 'Hotel entrance gate', lat: 9.0123, lng: 38.7582 },
        { name: 'Reception Desk', description: 'Lobby reception area', lat: 9.0118, lng: 38.7578 },
        { name: 'Rooftop Stairwell', description: 'Rooftop access point', lat: 9.0121, lng: 38.7583 },
      ],
    },
  ];

  let cpCount = 0;
  for (const group of checkpointData) {
    const routeId = ids.patrolRoutes[group.site];
    const siteId = ids.sites[group.site];
    for (let i = 0; i < group.checkpoints.length; i++) {
      const cp = group.checkpoints[i];
      const doc = await PatrolCheckpoint.findOneAndUpdate(
        { route: routeId, name: cp.name },
        {
          route: routeId,
          site: siteId,
          name: cp.name,
          description: cp.description,
          qrCode: uuidv4(),
          latitude: cp.lat,
          longitude: cp.lng,
          sortOrder: i + 1,
          status: 'ACTIVE',
        },
        { upsert: true, new: true }
      );
      ids.patrolCheckpoints[`${group.site}:${cp.name}`] = doc._id;
      cpCount++;
    }
  }
  log(`Created ${cpCount} patrol checkpoints`);
};

const seedPatrolSchedules = async () => {
  log('Creating patrol schedules...');
  const siteNames = ['Bole Medhanealem Tower', 'Merkato Commercial Center', 'Harmony Hotel'];
  let schedCount = 0;

  for (const siteName of siteNames) {
    const routeId = ids.patrolRoutes[siteName];
    const siteId = ids.sites[siteName];

    for (let day = 0; day <= 6; day++) {
      const doc = await PatrolSchedule.findOneAndUpdate(
        { route: routeId, dayOfWeek: day },
        {
          route: routeId,
          site: siteId,
          dayOfWeek: day,
          scheduledTime: new Date(todayStart.getTime() + 7 * 60 * 60 * 1000),
          frequency: 'DAILY',
          isActive: true,
        },
        { upsert: true, new: true }
      );
      schedCount++;
    }
  }
  log(`Created ${schedCount} patrol schedules`);
};

const seedGuardLocations = async () => {
  log('Creating guard locations...');
  const siteNames = ['Bole Medhanealem Tower', 'Merkato Commercial Center', 'Harmony Hotel'];
  const guardEmails = Object.keys(ids.guards);
  let locCount = 0;

  const onDutyGuards = guardEmails.filter((e) => e.startsWith('guard1') || e.startsWith('guard2') || e.startsWith('guard3') || e.startsWith('guard4'));

  for (const email of onDutyGuards) {
    const guardId = ids.guards[email];
    const guardDoc = await Guard.findById(guardId);
    const siteId = guardDoc.assignedSite;
    const siteDoc = await Site.findById(siteId);
    const shiftId = ids.shifts[`${email}:today`];

    for (let j = 0; j < 3; j++) {
      const offsetLat = (Math.random() - 0.5) * 0.0015;
      const offsetLng = (Math.random() - 0.5) * 0.0015;
      const lat = siteDoc.latitude + offsetLat;
      const lng = siteDoc.longitude + offsetLng;
      const dist = Math.sqrt(Math.pow(offsetLat * 111000, 2) + Math.pow(offsetLng * 111000 * Math.cos(siteDoc.latitude * Math.PI / 180), 2));
      const inside = dist <= siteDoc.geofenceRadius;

      await GuardLocation.findOneAndUpdate(
        { guard: guardId, recordedAt: new Date(now.getTime() - j * 30 * 60 * 1000) },
        {
          guard: guardId,
          site: siteId,
          shift: shiftId,
          location: { type: 'Point', coordinates: [lng, lat] },
          latitude: lat,
          longitude: lng,
          accuracyM: Math.floor(3 + Math.random() * 15),
          batteryLevel: Math.floor(50 + Math.random() * 50),
          networkStatus: 'CONNECTED',
          deviceId: guardDoc.device.deviceId,
          locationStatus: inside ? 'INSIDE_GEOFENCE' : 'OUTSIDE_GEOFENCE',
          distanceFromSiteM: Math.round(dist),
          recordedAt: new Date(now.getTime() - j * 30 * 60 * 1000),
        },
        { upsert: true, new: true }
      );
      locCount++;
    }
  }

  const guard5Email = 'guard5@vital.com';
  const guard5Id = ids.guards[guard5Email];
  const guard5Doc = await Guard.findById(guard5Id);
  const site5Doc = await Site.findById(guard5Doc.assignedSite);
  await GuardLocation.findOneAndUpdate(
    { guard: guard5Id, recordedAt: new Date(now.getTime() - 15 * 60 * 1000) },
    {
      guard: guard5Id,
      site: guard5Doc.assignedSite,
      location: { type: 'Point', coordinates: [site5Doc.longitude + 0.005, site5Doc.latitude + 0.005] },
      latitude: site5Doc.latitude + 0.005,
      longitude: site5Doc.longitude + 0.005,
      accuracyM: 8,
      batteryLevel: 35,
      networkStatus: 'CONNECTED',
      deviceId: guard5Doc.device.deviceId,
      locationStatus: 'OUTSIDE_GEOFENCE',
      distanceFromSiteM: 600,
      recordedAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
    { upsert: true, new: true }
  );
  locCount++;

  log(`Created ${locCount} guard locations`);
};

const seedPatrolEvents = async () => {
  log('Creating patrol events...');
  const onDutyGuards = ['guard1@vital.com', 'guard2@vital.com', 'guard3@vital.com'];
  const siteNames = ['Bole Medhanealem Tower', 'Merkato Commercial Center', 'Harmony Hotel'];
  let eventCount = 0;

  const checkpointGroups = [
    ['Bole Medhanealem Tower:Main Gate Checkpoint', 'Bole Medhanealem Tower:Parking Entry Checkpoint', 'Bole Medhanealem Tower:Rear Exit Checkpoint'],
    ['Merkato Commercial Center:Main Entrance Gate', 'Merkato Commercial Center:Warehouse Door'],
    ['Harmony Hotel:Hotel Main Gate', 'Harmony Hotel:Reception Desk', 'Harmony Hotel:Rooftop Stairwell'],
  ];

  for (let i = 0; i < onDutyGuards.length; i++) {
    const email = onDutyGuards[i];
    const guardId = ids.guards[email];
    const guardDoc = await Guard.findById(guardId);
    const siteId = guardDoc.assignedSite;
    const shiftId = ids.shifts[`${email}:today`];
    const routeId = ids.patrolRoutes[siteNames[i]];
    const cps = checkpointGroups[i];

    for (let j = 0; j < cps.length; j++) {
      const cpId = ids.patrolCheckpoints[cps[j]];
      const cpDoc = await PatrolCheckpoint.findById(cpId);
      await PatrolEvent.findOneAndUpdate(
        { guard: guardId, checkpoint: cpId, scannedAt: new Date(now.getTime() - (cps.length - j) * 20 * 60 * 1000) },
        {
          guard: guardId,
          site: siteId,
          shift: shiftId,
          route: routeId,
          checkpoint: cpId,
          checkpointName: cpDoc.name,
          location: { type: 'Point', coordinates: [cpDoc.longitude, cpDoc.latitude] },
          latitude: cpDoc.latitude,
          longitude: cpDoc.longitude,
          accuracyM: Math.floor(3 + Math.random() * 10),
          geofenceStatus: 'INSIDE_GEOFENCE',
          scannedAt: new Date(now.getTime() - (cps.length - j) * 20 * 60 * 1000),
          deviceId: guardDoc.device.deviceId,
        },
        { upsert: true, new: true }
      );
      eventCount++;
    }
  }
  log(`Created ${eventCount} patrol events`);
};

const seedGuardReports = async () => {
  log('Creating guard reports...');
  const siteNames = ['Bole Medhanealem Tower', 'Merkato Commercial Center', 'Harmony Hotel'];
  const reports = [
    {
      guard: 'guard1@vital.com', site: 'Bole Medhanealem Tower', category: 'SECURITY INCIDENT',
      priority: 'HIGH', title: 'Unauthorized entry attempt at rear exit',
      description: 'An unidentified individual attempted to gain access through the rear exit door without valid credentials. Security was alerted and the individual was escorted off premises.',
      status: 'SUBMITTED', submittedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
    {
      guard: 'guard1@vital.com', site: 'Bole Medhanealem Tower', category: 'EQUIPMENT_PROBLEM',
      priority: 'MEDIUM', title: 'CCTV camera offline at parking level 2',
      description: 'Camera CCTV-P2-03 has been offline since 14:30. Notified maintenance team. Camera covers parking bay 15-25.',
      status: 'APPROVED', submittedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      reviewedBy: 'croom@vital.com', reviewedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      approvedBy: 'supervisor@vital.com', approvedAt: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
    },
    {
      guard: 'guard2@vital.com', site: 'Merkato Commercial Center', category: 'SUSPICIOUS_ACTIVITY',
      priority: 'HIGH', title: 'Suspicious package near warehouse',
      description: 'Unattended bag found near warehouse loading dock. Area cordoned off and control room notified. Bomb squad requested.',
      status: 'SUBMITTED', submittedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      guard: 'guard3@vital.com', site: 'Harmony Hotel', category: 'POST_PROBLEM',
      priority: 'MEDIUM', title: 'Guest access to restricted rooftop area',
      description: 'Two hotel guests bypassed the rooftop access door and were found on the observation deck. Door lock mechanism appears to be malfunctioning.',
      status: 'RETURNED', submittedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      reviewedBy: 'croom@vital.com', reviewedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      reviewNotes: 'Please add more detail about the time of the incident and witness names.',
    },
    {
      guard: 'guard4@vital.com', site: 'Bole Medhanealem Tower', category: 'RADIO_PROBLEM',
      priority: 'LOW', title: 'Intermittent radio signal on channel 3',
      description: 'Radio communication on channel 3 experiencing intermittent static. Backup channel 7 used for critical communications.',
      status: 'APPROVED', submittedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      reviewedBy: 'croom@vital.com', reviewedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      approvedBy: 'supervisor@vital.com', approvedAt: new Date(now.getTime() - 6.5 * 60 * 60 * 1000),
    },
    {
      guard: 'guard2@vital.com', site: 'Merkato Commercial Center', category: 'GENERAL',
      priority: 'MEDIUM', title: 'Shift handover completed successfully',
      description: 'Night shift handover to day shift completed. All posts secured. Equipment inventory verified. 3 radios, 2 flashlights, 1 first aid kit.',
      status: 'SUBMITTED', submittedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    {
      guard: 'guard3@vital.com', site: 'Harmony Hotel', category: 'MAINTENANCE',
      priority: 'LOW', title: 'Lobby lighting flickering',
      description: 'Two ceiling lights in the main lobby corridor are flickering intermittently. Could affect security camera footage quality.',
      status: 'SUBMITTED', submittedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      guard: 'guard4@vital.com', site: 'Bole Medhanealem Tower', category: 'SECURITY_INCIDENT',
      priority: 'CRITICAL', title: 'Fire alarm triggered on floor 12',
      description: 'Fire alarm activated on floor 12 at 09:45. Evacuation initiated. Fire department responded. False alarm due to electrical fault in server room.',
      status: 'UNDER_REVIEW', submittedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      reviewedBy: 'croom@vital.com', reviewedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
  ];

  let reportCount = 0;
  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    const guardId = ids.guards[r.guard];
    const siteId = ids.sites[r.site];
    const guardDoc = await Guard.findById(guardId);
    const postKey = `${r.site}:${guardDoc.assignedPost ? (await Post.findById(guardDoc.assignedPost)).name : 'Main Gate'}`;
    const postId = ids.posts[Object.keys(ids.posts).find((k) => k.startsWith(r.site))] || undefined;

    const reportData = {
      reportNumber: `GR-${String(i + 1).padStart(5, '0')}`,
      guard: guardId,
      site: siteId,
      post: postId || undefined,
      shift: ids.shifts[`${r.guard}:today`],
      category: r.category,
      priority: r.priority,
      title: r.title,
      description: r.description,
      status: r.status,
      submittedAt: r.submittedAt,
      location: {
        type: 'Point',
        coordinates: [siteDocLng(r.site), siteDocLat(r.site)],
      },
      latitude: siteDocLat(r.site),
      longitude: siteDocLng(r.site),
    };

    if (r.reviewedBy) reportData.reviewedBy = ids.users[r.reviewedBy];
    if (r.reviewedAt) reportData.reviewedAt = r.reviewedAt;
    if (r.reviewNotes) reportData.reviewNotes = r.reviewNotes;
    if (r.approvedBy) reportData.approvedBy = ids.users[r.approvedBy];
    if (r.approvedAt) reportData.approvedAt = r.approvedAt;
    if (r.actionTaken) reportData.actionTaken = r.actionTaken;

    await GuardReport.findOneAndUpdate(
      { reportNumber: reportData.reportNumber },
      reportData,
      { upsert: true, new: true }
    );
    reportCount++;
  }
  log(`Created ${reportCount} guard reports`);
};

function siteDocLat(siteName) {
  const coords = { 'Bole Medhanealem Tower': 9.0054, 'Merkato Commercial Center': 9.0350, 'Harmony Hotel': 9.0120 };
  return coords[siteName] || 9.0;
}
function siteDocLng(siteName) {
  const coords = { 'Bole Medhanealem Tower': 38.7636, 'Merkato Commercial Center': 38.7460, 'Harmony Hotel': 38.7580 };
  return coords[siteName] || 38.75;
}

const seedIncidents = async () => {
  log('Creating incidents...');
  const incidents = [
    {
      site: 'Bole Medhanealem Tower', severity: 'HIGH', status: 'INVESTIGATING',
      incidentType: 'Unauthorized Access',
      description: 'Unauthorized individual attempted to access executive floor via stairwell. Badge system bypassed.',
      guard: 'guard1@vital.com', reportedBy: 'croom@vital.com',
      guardExplanation: 'I observed the individual on CCTV attempting to force the stairwell door. I immediately radioed control room and proceeded to intercept.',
      controlRoomNotes: 'Reviewing CCTV footage from 09:00-09:30. Access logs show no badge swipe for the individual.',
      firstResponseAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      site: 'Merkato Commercial Center', severity: 'MEDIUM', status: 'OPEN',
      incidentType: 'Theft Report',
      description: 'Vendor reported stolen merchandise from warehouse section B. Estimated value ETB 45,000.',
      guard: 'guard2@vital.com', reportedBy: 'guard2@vital.com',
      guardExplanation: 'Vendor Tadesse arrived at 07:30 and discovered the warehouse lock broken. I secured the area and took statements.',
      reportedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      site: 'Harmony Hotel', severity: 'CRITICAL', status: 'ESCALATED',
      incidentType: 'Fire Alarm',
      description: 'Fire alarm activated in kitchen area. Kitchen staff evacuated. No visible flames detected.',
      guard: 'guard3@vital.com', reportedBy: 'croom@vital.com',
      guardExplanation: 'I responded to the alarm within 3 minutes. Kitchen was clear of flames but strong smoke smell detected near the exhaust hood.',
      controlRoomNotes: 'Fire department dispatched at 14:22. Awaiting arrival.',
      escalatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      firstResponseAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
    },
    {
      site: 'Bole Medhanealem Tower', severity: 'LOW', status: 'RESOLVED',
      incidentType: 'Equipment Malfunction',
      description: 'Turnstile gate #2 jammed during peak entry hours causing queue buildup.',
      guard: 'guard4@vital.com', reportedBy: 'guard4@vital.com',
      guardExplanation: 'Gate jammed at 08:15 during morning rush. I manually operated the gate and contacted maintenance.',
      controlRoomNotes: 'Maintenance arrived at 08:45. Gate repaired by 09:30. Root cause: worn gear mechanism.',
      resolvedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      firstResponseAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      rootCause: 'Worn gear mechanism in turnstile motor',
      actionTaken: 'Maintenance replaced gear assembly. Preventive maintenance scheduled for all turnstiles.',
    },
    {
      site: 'Merkato Commercial Center', severity: 'MEDIUM', status: 'INVESTIGATING',
      incidentType: 'Trespassing',
      description: 'Individuals found sleeping in warehouse area after hours. No stolen property identified.',
      guard: 'guard2@vital.com', reportedBy: 'guard2@vital.com',
      guardExplanation: 'During 22:00 patrol, I discovered two individuals sleeping behind warehouse pallets. They claimed to be workers who missed closing time.',
      controlRoomNotes: 'Verifying employment status with warehouse manager. Individuals released with warning.',
      firstResponseAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    },
  ];

  let incCount = 0;
  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i];
    const siteId = ids.sites[inc.site];
    const data = {
      incidentNumber: `INC-${String(i + 1).padStart(5, '0')}`,
      site: siteId,
      incidentType: inc.incidentType,
      severity: inc.severity,
      description: inc.description,
      status: inc.status,
      reportedAt: inc.reportedAt || new Date(now.getTime() - 6 * 60 * 60 * 1000),
      latitude: siteDocLat(inc.site),
      longitude: siteDocLng(inc.site),
      location: { type: 'Point', coordinates: [siteDocLng(inc.site), siteDocLat(inc.site)] },
    };
    if (inc.guard) data.guard = ids.guards[inc.guard];
    if (inc.reportedBy) data.reportedBy = ids.users[inc.reportedBy];
    if (inc.guardExplanation) data.guardExplanation = inc.guardExplanation;
    if (inc.controlRoomNotes) data.controlRoomNotes = inc.controlRoomNotes;
    if (inc.firstResponseAt) data.firstResponseAt = inc.firstResponseAt;
    if (inc.escalatedAt) data.escalatedAt = inc.escalatedAt;
    if (inc.resolvedAt) data.resolvedAt = inc.resolvedAt;
    if (inc.rootCause) data.rootCause = inc.rootCause;
    if (inc.actionTaken) data.actionTaken = inc.actionTaken;

    await Incident.findOneAndUpdate(
      { incidentNumber: data.incidentNumber },
      data,
      { upsert: true, new: true }
    );
    incCount++;
  }
  log(`Created ${incCount} incidents`);
};

const seedAESEvents = async () => {
  log('Creating AES events...');
  const events = [
    {
      site: 'Bole Medhanealem Tower', alarmType: 'BURGLARY', status: 'VERIFIED',
      zone: 'Zone A - Main Entrance',
      operatorAction: 'Verified alarm with on-site guard. Forced entry detected at main entrance door.',
      verificationResult: 'Confirmed break-in attempt',
      verifiedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      resolution: 'Entry secured. Lock replaced. Incident report filed.',
      responseTimeSeconds: 45, verificationTimeSeconds: 120,
    },
    {
      site: 'Merkato Commercial Center', alarmType: 'PANIC', status: 'ESCALATED',
      zone: 'Zone B - Warehouse',
      operatorAction: 'Panic button pressed. Contacted guard for verification.',
      escalated: true, escalatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      responseTimeSeconds: 30, verificationTimeSeconds: 90,
    },
    {
      site: 'Harmony Hotel', alarmType: 'FIRE', status: 'FALSE_ALARM',
      zone: 'Zone C - Kitchen',
      operatorAction: 'Fire alarm activated. Dispatched guard and fire department.',
      verificationResult: 'Cooking smoke triggered sensor',
      falseAlarm: true,
      resolvedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      resolution: 'Kitchen exhaust fan malfunction. Sensor cleaned and reset.',
      responseTimeSeconds: 60, verificationTimeSeconds: 180,
    },
    {
      site: 'Bole Medhanealem Tower', alarmType: 'BURGLARY', status: 'RESOLVED',
      zone: 'Zone D - Parking',
      operatorAction: 'Motion detected in parking area. Guard dispatched.',
      verificationResult: 'Stray animal triggered sensor',
      verifiedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      resolution: 'Motion sensor sensitivity adjusted. Area secured.',
      responseTimeSeconds: 50, verificationTimeSeconds: 150,
    },
    {
      site: 'Merkato Commercial Center', alarmType: 'TAMPER', status: 'RECEIVED',
      zone: 'Zone A - Front Gate',
      operatorAction: 'Tamper alert on front gate lock. Monitoring.',
      responseTimeSeconds: 20,
    },
    {
      site: 'Harmony Hotel', alarmType: 'MEDICAL', status: 'RESOLVED',
      zone: 'Zone B - Lobby',
      operatorAction: 'Medical emergency button pressed by guest. Dispatched first aid.',
      verifiedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      resolution: 'Guest experienced mild dizziness. First aid administered. Ambulance not required.',
      responseTimeSeconds: 25, verificationTimeSeconds: 60,
    },
    {
      site: 'Bole Medhanealem Tower', alarmType: 'POWER', status: 'VERIFIED',
      zone: 'Zone E - Server Room',
      operatorAction: 'Power failure detected in server room. UPS activated.',
      verificationResult: 'Confirmed power outage on floors 10-15',
      verifiedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
      resolution: 'Generator activated. Power restored after 45 minutes.',
      responseTimeSeconds: 15, verificationTimeSeconds: 300,
    },
    {
      site: 'Merkato Commercial Center', alarmType: 'COMMUNICATION_FAILURE', status: 'VERIFIED',
      zone: 'Zone C - Perimeter',
      operatorAction: 'Perimeter sensor communication lost. Investigating.',
      verificationResult: 'Wire cut by construction work',
      verifiedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
      resolution: 'Wire repaired. Construction team notified of sensor locations.',
      responseTimeSeconds: 40, verificationTimeSeconds: 240,
    },
  ];

  let aesCount = 0;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const siteId = ids.sites[e.site];
    const data = {
      eventId: `AES-${String(i + 1).padStart(5, '0')}`,
      site: siteId,
      zone: e.zone,
      alarmType: e.alarmType,
      receivedAt: new Date(now.getTime() - (events.length - i) * 2 * 60 * 60 * 1000),
      status: e.status,
    };
    if (e.operator) data.operator = ids.users[e.operator];
    else data.operator = ids.users['operator@vital.com'];
    if (e.operatorAction) data.operatorAction = e.operatorAction;
    if (e.verificationResult) data.verificationResult = e.verificationResult;
    if (e.falseAlarm !== undefined) data.falseAlarm = e.falseAlarm;
    if (e.escalated !== undefined) data.escalated = e.escalated;
    if (e.escalatedAt) data.escalatedAt = e.escalatedAt;
    if (e.verifiedAt) data.verifiedAt = e.verifiedAt;
    if (e.resolvedAt) data.resolvedAt = e.resolvedAt;
    if (e.resolution) data.resolution = e.resolution;
    if (e.responseTimeSeconds) data.responseTimeSeconds = e.responseTimeSeconds;
    if (e.verificationTimeSeconds) data.verificationTimeSeconds = e.verificationTimeSeconds;

    await AESEvent.findOneAndUpdate(
      { eventId: data.eventId },
      data,
      { upsert: true, new: true }
    );
    aesCount++;
  }
  log(`Created ${aesCount} AES events`);
};

const seedRadioCommunications = async () => {
  log('Creating radio communications...');
  const comms = [
    {
      guard: 'guard1@vital.com', site: 'Bole Medhanealem Tower',
      communicationType: 'RADIO', message: 'Main gate secure. All clear.',
      status: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      responseTimeSeconds: 5,
    },
    {
      guard: 'guard2@vital.com', site: 'Merkato Commercial Center',
      communicationType: 'RADIO', message: 'Suspicious activity near warehouse. Requesting backup.',
      status: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      responseTimeSeconds: 8,
    },
    {
      guard: 'guard3@vital.com', site: 'Harmony Hotel',
      communicationType: 'PHONE', message: 'Guest medical emergency in lobby. First aid deployed.',
      status: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      responseTimeSeconds: 12,
    },
    {
      guard: 'guard4@vital.com', site: 'Bole Medhanealem Tower',
      communicationType: 'RADIO', message: 'Turnstile malfunction reported. Maintenance needed.',
      status: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      responseTimeSeconds: 10,
    },
    {
      guard: 'guard1@vital.com', site: 'Bole Medhanealem Tower',
      communicationType: 'SMS', message: 'Shift handover complete. All equipment accounted for.',
      status: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      responseTimeSeconds: 3,
    },
    {
      guard: 'guard2@vital.com', site: 'Merkato Commercial Center',
      communicationType: 'RADIO', message: 'Perimeter check complete. No issues.',
      status: 'SENT',
    },
    {
      guard: 'guard3@vital.com', site: 'Harmony Hotel',
      communicationType: 'RADIO', message: 'Rooftop access door requires repair. Guests accessed restricted area.',
      status: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      responseTimeSeconds: 15,
    },
    {
      guard: 'guard4@vital.com', site: 'Bole Medhanealem Tower',
      communicationType: 'IN_PERSON', message: 'Reported fire alarm on floor 12 to control room verbally.',
      status: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      responseTimeSeconds: 2,
    },
  ];

  let commCount = 0;
  for (let i = 0; i < comms.length; i++) {
    const c = comms[i];
    const data = {
      communicationId: `COM-${String(i + 1).padStart(5, '0')}`,
      guard: ids.guards[c.guard],
      site: ids.sites[c.site],
      operator: ids.users['operator@vital.com'],
      communicationType: c.communicationType,
      message: c.message,
      sentAt: new Date(now.getTime() - (comms.length - i) * 1.5 * 60 * 60 * 1000),
      status: c.status,
    };
    if (c.acknowledgedAt) data.acknowledgedAt = c.acknowledgedAt;
    if (c.responseTimeSeconds) data.responseTimeSeconds = c.responseTimeSeconds;

    await RadioCommunication.findOneAndUpdate(
      { communicationId: data.communicationId },
      data,
      { upsert: true, new: true }
    );
    commCount++;
  }
  log(`Created ${commCount} radio communications`);
};

const seedControlRoomLogs = async () => {
  log('Creating control room logs...');
  const logs = [
    {
      operator: 'operator@vital.com', category: 'GUARD_ACTIVITY',
      event: 'Guard Check-in', description: 'Guard 1 checked in at main gate',
      actionTaken: 'Verified guard position via GPS', relatedGuard: 'guard1@vital.com',
      relatedSite: 'Bole Medhanealem Tower', status: 'CLOSED',
    },
    {
      operator: 'operator@vital.com', category: 'AES_ALARM',
      event: 'Burglary Alarm Received', description: 'AES alarm triggered at Zone A',
      actionTaken: 'Dispatched guard and notified supervisor', relatedSite: 'Bole Medhanealem Tower',
      status: 'ESCALATED',
    },
    {
      operator: 'croom@vital.com', category: 'INCIDENT',
      event: 'Incident Report Filed', description: 'Unauthorized access incident on executive floor',
      actionTaken: 'Created incident INC-00001. CCTV review initiated.',
      relatedSite: 'Bole Medhanealem Tower', status: 'OPEN',
    },
    {
      operator: 'operator@vital.com', category: 'SYSTEM',
      event: 'System Health Check', description: 'Automated system health check completed',
      actionTaken: 'All systems operational. No alerts.', status: 'CLOSED',
    },
    {
      operator: 'operator@vital.com', category: 'GUARD_ACTIVITY',
      event: 'Guard Location Alert', description: 'Guard 5 detected outside geofence at Merkato',
      actionTaken: 'Contacted guard for location verification',
      relatedGuard: 'guard5@vital.com', relatedSite: 'Merkato Commercial Center', status: 'OPEN',
    },
    {
      operator: 'croom@vital.com', category: 'PATROL',
      event: 'Patrol Completion', description: 'Tower Perimeter Patrol completed by Guard 1',
      actionTaken: 'Patrol log reviewed and approved',
      relatedGuard: 'guard1@vital.com', relatedSite: 'Bole Medhanealem Tower', status: 'CLOSED',
    },
    {
      operator: 'operator@vital.com', category: 'RADIO',
      event: 'Radio Communication Log', description: 'Routine radio check completed across all sites',
      actionTaken: 'All guards responded within acceptable timeframe', status: 'CLOSED',
    },
    {
      operator: 'croom@vital.com', category: 'INCIDENT',
      event: 'Incident Escalation', description: 'Fire alarm incident at Harmony Hotel escalated to fire department',
      actionTaken: 'Fire department dispatched. Guests evacuated from affected floor.',
      relatedSite: 'Harmony Hotel', status: 'ESCALATED',
    },
  ];

  let logCount = 0;
  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    const data = {
      date: new Date(now.getTime() - (logs.length - i) * 1.5 * 60 * 60 * 1000),
      operator: ids.users[l.operator],
      event: l.event,
      category: l.category,
      description: l.description,
      actionTaken: l.actionTaken,
      status: l.status,
    };
    if (l.relatedGuard) data.relatedGuard = ids.guards[l.relatedGuard];
    if (l.relatedSite) data.relatedSite = ids.sites[l.relatedSite];

    await ControlRoomLog.findOneAndUpdate(
      { event: l.event, date: data.date },
      data,
      { upsert: true, new: true }
    );
    logCount++;
  }
  log(`Created ${logCount} control room logs`);
};

const seedDailyReport = async () => {
  log('Creating daily report...');
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  await DailyReport.findOneAndUpdate(
    { reportNumber: 'DR-00001' },
    {
      reportNumber: 'DR-00001',
      date: todayStart,
      period,
      title: `Daily Security Report - ${period}`,
      executiveSummary: 'All sites operated normally. One critical incident escalated at Harmony Hotel (fire alarm). Guard compliance at 94%. One guard reported outside geofence.',
      guardOperations: {
        guardsOnDuty: 4,
        guardsAbsent: 0,
        guardAccountability: 94,
        patrolCompliance: 92,
        locationCompliance: 88,
        narrative: 'Four guards on duty across three sites. Guard 5 reported outside geofence briefly. All other guards within geofence boundaries.',
      },
      qrPatrol: {
        scheduledPatrols: 9,
        completedPatrols: 8,
        missedPatrols: 1,
        compliancePercent: 89,
        narrative: '8 of 9 scheduled patrols completed. One patrol missed at Merkato due to incident response.',
      },
      gps: {
        activeGuards: 4,
        onlineGuards: 3,
        offlineGuards: 1,
        outsideGeofenceEvents: 1,
        narrative: 'Guard 5 detected outside geofence at 14:30. Issue resolved after guard returned to site.',
      },
      aes: {
        totalAlarms: 8,
        verifiedAlarms: 5,
        falseAlarms: 1,
        criticalAlarms: 2,
        averageResponseTime: 38,
        averageVerificationTime: 158,
        narrative: '8 AES events processed. Average response time 38 seconds. One false alarm in hotel kitchen.',
      },
      radio: {
        communications: 8,
        responseCompliance: 87,
        communicationIssues: 1,
        narrative: '8 radio communications logged. One delayed response (15 seconds) due to guard being in basement.',
      },
      incidents: {
        total: 5,
        open: 2,
        resolved: 1,
        critical: 1,
        escalated: 1,
        narrative: '5 incidents recorded. Fire alarm at Harmony Hotel escalated to fire department. Unauthorized access at Bole Tower under investigation.',
      },
      customerIssues: {
        notifications: 2,
        complaints: 0,
        clientRelatedIncidents: 1,
        narrative: 'Ethio Telecom notified of turnstile issue. Harmony Hotel management notified of fire alarm.',
      },
      controlRoomActivity: {
        majorActions: 'Fire alarm escalation at Harmony Hotel. AES event verification for burglary alarm at Bole Tower.',
        escalations: 'INC-00003 escalated to fire department. AES-00002 panic alarm escalated.',
        importantObservations: 'Guard 5 outside geofence event. System uptime at 99.2%.',
      },
      kpiSummary: {
        alarmResponse: { value: 38, status: 'GREEN' },
        qrPatrolCompliance: { value: 89, status: 'YELLOW' },
        alarmVerification: { value: 158, status: 'GREEN' },
        falseAlarmRate: { value: 12.5, status: 'YELLOW' },
        criticalEscalation: { value: 45, status: 'GREEN' },
        incidentReports: { value: 80, status: 'GREEN' },
        systemUptime: { value: 99.2, status: 'GREEN' },
        customerComplaints: { value: 0, status: 'GREEN' },
      },
      managementAttention: [
        'Guard 5 geofence violation requires follow-up',
        'Fire alarm system at Harmony Hotel needs sensor recalibration',
        'Turnstile maintenance overdue at Bole Tower',
      ],
      recommendations: [
        'Schedule preventive maintenance for all turnstiles',
        'Conduct fire alarm sensor inspection at Harmony Hotel',
        'Implement stricter geofence monitoring for off-site movements',
      ],
      status: 'APPROVED',
      createdBy: ids.users['croom@vital.com'],
      approvedBy: ids.users['supervisor@vital.com'],
      approvedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
    { upsert: true, new: true }
  );
  log('Created 1 daily report');
};

const seedKPISnapshots = async () => {
  log('Creating KPI snapshots...');
  const snapshots = [
    {
      date: todayStart, period: 'DAILY',
      kpis: {
        alarmResponseTime: { value: 38, target: 60, status: 'GREEN' },
        alarmVerificationTime: { value: 158, target: 180, status: 'GREEN' },
        emergencyEscalationTime: { value: 45, target: 120, status: 'GREEN' },
        guardCheckInCompliance: { value: 94, target: 90, status: 'GREEN' },
        missedQRPatrols: { value: 1, target: 0, status: 'YELLOW' },
        falseAlarmRate: { value: 12.5, target: 10, status: 'YELLOW' },
        unverifiedAlarmRate: { value: 1.5, target: 2, status: 'GREEN' },
        incidentReportCompletion: { value: 80, target: 90, status: 'YELLOW' },
        reportSubmissionOnTime: { value: 95, target: 90, status: 'GREEN' },
        guardAbsenceDetection: { value: 100, target: 100, status: 'GREEN' },
        communicationResponse: { value: 28, target: 30, status: 'GREEN' },
        radioAvailability: { value: 98, target: 99, status: 'YELLOW' },
        systemUptime: { value: 99.2, target: 99, status: 'GREEN' },
        customerNotificationTime: { value: 25, target: 30, status: 'GREEN' },
        incidentClosureRate: { value: 20, target: 25, status: 'YELLOW' },
        escalationCompliance: { value: 92, target: 90, status: 'GREEN' },
        controlRoomAttendance: { value: 100, target: 100, status: 'GREEN' },
        dailyLogAccuracy: { value: 96, target: 95, status: 'GREEN' },
        customerComplaints: { value: 0, target: 0, status: 'GREEN' },
      },
      guardAccountabilityScore: { qrPatrol: 89, attendance: 100, communication: 87, reporting: 94, total: 92.5 },
      controlRoomScore: {
        guardAccountability: 92, alarmEmergencyResponse: 95, incidentManagement: 88,
        reportingAccuracy: 94, communication: 90, systemUptime: 99, customerService: 96,
        total: 93.4, rating: 'A',
      },
    },
    {
      date: yesterdayStart, period: 'DAILY',
      kpis: {
        alarmResponseTime: { value: 42, target: 60, status: 'GREEN' },
        alarmVerificationTime: { value: 165, target: 180, status: 'GREEN' },
        emergencyEscalationTime: { value: 55, target: 120, status: 'GREEN' },
        guardCheckInCompliance: { value: 96, target: 90, status: 'GREEN' },
        missedQRPatrols: { value: 0, target: 0, status: 'GREEN' },
        falseAlarmRate: { value: 8, target: 10, status: 'GREEN' },
        unverifiedAlarmRate: { value: 1, target: 2, status: 'GREEN' },
        incidentReportCompletion: { value: 100, target: 90, status: 'GREEN' },
        reportSubmissionOnTime: { value: 100, target: 90, status: 'GREEN' },
        guardAbsenceDetection: { value: 100, target: 100, status: 'GREEN' },
        communicationResponse: { value: 22, target: 30, status: 'GREEN' },
        radioAvailability: { value: 99.5, target: 99, status: 'GREEN' },
        systemUptime: { value: 99.8, target: 99, status: 'GREEN' },
        customerNotificationTime: { value: 18, target: 30, status: 'GREEN' },
        incidentClosureRate: { value: 25, target: 25, status: 'GREEN' },
        escalationCompliance: { value: 95, target: 90, status: 'GREEN' },
        controlRoomAttendance: { value: 100, target: 100, status: 'GREEN' },
        dailyLogAccuracy: { value: 98, target: 95, status: 'GREEN' },
        customerComplaints: { value: 0, target: 0, status: 'GREEN' },
      },
      guardAccountabilityScore: { qrPatrol: 95, attendance: 100, communication: 92, reporting: 98, total: 96.3 },
      controlRoomScore: {
        guardAccountability: 96, alarmEmergencyResponse: 92, incidentManagement: 95,
        reportingAccuracy: 98, communication: 94, systemUptime: 99, customerService: 97,
        total: 95.9, rating: 'A',
      },
    },
    {
      date: new Date(yesterdayStart.getTime() - 24 * 60 * 60 * 1000), period: 'DAILY',
      kpis: {
        alarmResponseTime: { value: 55, target: 60, status: 'GREEN' },
        alarmVerificationTime: { value: 190, target: 180, status: 'YELLOW' },
        emergencyEscalationTime: { value: 70, target: 120, status: 'GREEN' },
        guardCheckInCompliance: { value: 91, target: 90, status: 'GREEN' },
        missedQRPatrols: { value: 2, target: 0, status: 'RED' },
        falseAlarmRate: { value: 15, target: 10, status: 'YELLOW' },
        unverifiedAlarmRate: { value: 3, target: 2, status: 'YELLOW' },
        incidentReportCompletion: { value: 75, target: 90, status: 'RED' },
        reportSubmissionOnTime: { value: 85, target: 90, status: 'RED' },
        guardAbsenceDetection: { value: 100, target: 100, status: 'GREEN' },
        communicationResponse: { value: 45, target: 30, status: 'YELLOW' },
        radioAvailability: { value: 97, target: 99, status: 'YELLOW' },
        systemUptime: { value: 98.5, target: 99, status: 'YELLOW' },
        customerNotificationTime: { value: 40, target: 30, status: 'YELLOW' },
        incidentClosureRate: { value: 15, target: 25, status: 'RED' },
        escalationCompliance: { value: 85, target: 90, status: 'RED' },
        controlRoomAttendance: { value: 100, target: 100, status: 'GREEN' },
        dailyLogAccuracy: { value: 90, target: 95, status: 'YELLOW' },
        customerComplaints: { value: 1, target: 0, status: 'RED' },
      },
      guardAccountabilityScore: { qrPatrol: 80, attendance: 100, communication: 78, reporting: 82, total: 85.0 },
      controlRoomScore: {
        guardAccountability: 85, alarmEmergencyResponse: 82, incidentManagement: 78,
        reportingAccuracy: 85, communication: 80, systemUptime: 98, customerService: 88,
        total: 85.1, rating: 'B',
      },
    },
  ];

  let kpiCount = 0;
  for (const s of snapshots) {
    await KPISnapshot.findOneAndUpdate(
      { date: s.date, period: s.period },
      s,
      { upsert: true, new: true }
    );
    kpiCount++;
  }
  log(`Created ${kpiCount} KPI snapshots`);
};

const seedNotifications = async () => {
  log('Creating notifications...');
  const notifs = [
    {
      user: 'croom@vital.com', type: 'ALARM', title: 'AES Alarm - Burglary',
      message: 'Burglary alarm triggered at Bole Medhanealem Tower Zone A.',
      severity: 'CRITICAL', isRead: true, readAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      resourceModel: 'AESEvent',
    },
    {
      user: 'supervisor@vital.com', type: 'INCIDENT', title: 'Incident Escalated',
      message: 'Fire alarm incident at Harmony Hotel has been escalated to fire department.',
      severity: 'CRITICAL', isRead: true, readAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      resourceModel: 'Incident',
    },
    {
      user: 'operator@vital.com', type: 'GUARD_ALERT', title: 'Guard Outside Geofence',
      message: 'Guard 5 (Fikru Mengistu) detected outside geofence at Merkato Commercial Center.',
      severity: 'WARNING', isRead: false,
      resourceModel: 'Guard',
    },
    {
      user: 'croom@vital.com', type: 'REPORT', title: 'Guard Report Submitted',
      message: 'New security incident report submitted by Guard 1 (Dawit Alemayehu).',
      severity: 'INFO', isRead: false,
      resourceModel: 'GuardReport',
    },
    {
      user: 'admin@vital.com', type: 'SYSTEM', title: 'Daily Report Approved',
      message: 'Daily report DR-00001 has been approved by supervisor.',
      severity: 'INFO', isRead: true, readAt: new Date(now.getTime() - 30 * 60 * 1000),
      resourceModel: 'DailyReport',
    },
    {
      user: 'guard5@vital.com', type: 'WARNING', title: 'Geofence Violation',
      message: 'You have been detected outside the assigned geofence area. Please return immediately.',
      severity: 'WARNING', isRead: false,
    },
    {
      user: 'ops@vital.com', type: 'INCIDENT', title: 'Critical Incident - Fire Alarm',
      message: 'Critical incident INC-00003 at Harmony Hotel - Fire alarm in kitchen area.',
      severity: 'CRITICAL', isRead: true, readAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      resourceModel: 'Incident',
    },
    {
      user: 'security@vital.com', type: 'AES', title: 'AES Event Summary',
      message: '8 AES events processed today. Average response time: 38 seconds.',
      severity: 'INFO', isRead: false,
      resourceModel: 'AESEvent',
    },
  ];

  let notifCount = 0;
  for (let i = 0; i < notifs.length; i++) {
    const n = notifs[i];
    const data = {
      user: ids.users[n.user],
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      isRead: n.isRead,
      resourceModel: n.resourceModel,
    };
    if (n.readAt) data.readAt = n.readAt;

    await Notification.findOneAndUpdate(
      { user: data.user, title: n.title },
      data,
      { upsert: true, new: true }
    );
    notifCount++;
  }
  log(`Created ${notifCount} notifications`);
};

const seedAuditLogs = async () => {
  log('Creating audit logs...');
  const logs = [
    {
      user: 'admin@vital.com', action: 'LOGIN', resource: 'User',
      resourceId: ids.users['admin@vital.com'], newValue: { email: 'admin@vital.com' },
      ip: '192.168.1.100', userAgent: 'Mozilla/5.0 Chrome/120',
    },
    {
      user: 'croom@vital.com', action: 'CREATE', resource: 'GuardReport',
      resourceId: ids.users['croom@vital.com'], newValue: { reportNumber: 'GR-00001' },
      reason: 'Created security incident report',
    },
    {
      user: 'supervisor@vital.com', action: 'APPROVE', resource: 'GuardReport',
      resourceId: ids.users['supervisor@vital.com'], oldValue: { status: 'UNDER_REVIEW' },
      newValue: { status: 'APPROVED' }, reason: 'Report verified and approved',
    },
    {
      user: 'operator@vital.com', action: 'ESCALATE', resource: 'AESEvent',
      resourceId: ids.users['operator@vital.com'], newValue: { escalated: true },
      reason: 'Panic alarm requires immediate response',
    },
    {
      user: 'croom@vital.com', action: 'CREATE', resource: 'DailyReport',
      resourceId: ids.users['croom@vital.com'], newValue: { reportNumber: 'DR-00001' },
      reason: 'Generated daily security report',
    },
    {
      user: 'admin@vital.com', action: 'UPDATE', resource: 'Role',
      resourceId: ids.roles[ROLES.CONTROL_ROOM_OPERATOR],
      oldValue: { permissions: 12 }, newValue: { permissions: 15 },
      reason: 'Added GPS tracking permission to operator role',
    },
    {
      user: 'supervisor@vital.com', action: 'UPDATE', resource: 'Guard',
      resourceId: ids.guards['guard5@vital.com'],
      oldValue: { status: 'ON_DUTY' }, newValue: { status: 'OUTSIDE_GEOFENCE' },
      reason: 'Guard detected outside geofence',
    },
    {
      user: 'admin@vital.com', action: 'SYSTEM_CONFIG', resource: 'Settings',
      newValue: { geofenceAlerts: true, autoEscalation: true },
      reason: 'System configuration update',
    },
  ];

  let auditCount = 0;
  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    const data = {
      user: ids.users[l.user],
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      reason: l.reason,
      ip: l.ip,
      userAgent: l.userAgent,
      timestamp: new Date(now.getTime() - (logs.length - i) * 2 * 60 * 60 * 1000),
    };
    if (l.oldValue) data.oldValue = l.oldValue;
    if (l.newValue) data.newValue = l.newValue;

    await AuditLog.findOneAndUpdate(
      { action: l.action, resource: l.resource, timestamp: data.timestamp },
      data,
      { upsert: true, new: true }
    );
    auditCount++;
  }
  log(`Created ${auditCount} audit logs`);
};

const clearAll = async () => {
  log('Clearing existing data...');
  const models = [
    AuditLog, Notification, KPISnapshot, DailyReport, ControlRoomLog,
    RadioCommunication, AESEvent, Incident, GuardReport, PatrolEvent,
    GuardLocation, PatrolSchedule, PatrolCheckpoint, PatrolRoute,
    Shift, Post, Site, Guard, User, Role, Permission,
  ];
  for (const model of models) {
    await model.deleteMany({});
  }
  log('All collections cleared');
};

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vital-security';
    await mongoose.connect(uri);
    log('Connected to MongoDB');

    await clearAll();

    const allPermissions = await seedPermissions();
    await seedRoles(allPermissions);
    await seedUsers();
    await seedSites();
    await seedPosts();
    await seedGuards();
    await seedShifts();
    await seedPatrolRoutes();
    await seedPatrolCheckpoints();
    await seedPatrolSchedules();
    await seedGuardLocations();
    await seedPatrolEvents();
    await seedGuardReports();
    await seedIncidents();
    await seedAESEvents();
    await seedRadioCommunications();
    await seedControlRoomLogs();
    await seedDailyReport();
    await seedKPISnapshots();
    await seedNotifications();
    await seedAuditLogs();

    log('========================================');
    log('Seed completed successfully!');
    log('========================================');
    log('Login credentials:');
    log('  Admin:           admin@vital.com / password123');
    log('  Control Room:    croom@vital.com / password123');
    log('  Operator:        operator@vital.com / password123');
    log('  Supervisor:      supervisor@vital.com / password123');
    log('  CEO:             ceo@vital.com / password123');
    log('  General Manager: gm@vital.com / password123');
    log('  Operations Mgr:  ops@vital.com / password123');
    log('  Security Mgr:    security@vital.com / password123');
    log('  Guards:          guard1@vital.com - guard8@vital.com / password123');
    log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('[SEED] Seed failed:', error);
    process.exit(1);
  }
};

seed();
