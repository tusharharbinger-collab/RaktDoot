'use strict';
const reportsService = require('./reports.service');

function getDriverReport(req, res, next) {
  try {
    const { driverId, period, startDate, endDate } = req.query;
    const report = reportsService.getDriverReport({ driverId, period, startDate, endDate });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

function getHospitalReport(req, res, next) {
  try {
    const { destinationId, period, startDate, endDate } = req.query;
    const report = reportsService.getHospitalReport({ destinationId, period, startDate, endDate });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

function exportCSV(req, res, next) {
  try {
    const { type, driverId, destinationId, period, startDate, endDate } = req.query;

    if (type === 'driver') {
      const data = reportsService.getDriverReport({ driverId, period, startDate, endDate });
      const rows = [];

      // Header comment / report title
      rows.push(['# RAKTDOOT TRACKER - JANKALYAN BLOOD CENTRE PUNE']);
      rows.push([`# DRIVER PERSONAL PERFORMANCE REPORT - Period: ${data.period} (${data.startDate} to ${data.endDate})`]);
      if (data.targetDriver) {
        rows.push([`# Driver: ${data.targetDriver.name} | Phone: ${data.targetDriver.phone || 'N/A'} | Vehicle: ${data.targetDriver.vehicle_type === 'four_wheeler' ? 'Four Wheeler' : 'Two Wheeler'} (${data.targetDriver.vehicle_number || 'N/A'})`]);
      }
      rows.push([`# Summary: Completed Trips: ${data.summary.completed_count}, Total Assigned: ${data.summary.total_assigned}, Total Distance: ${data.summary.total_distance_km} km, Total Hours: ${data.summary.total_duration_hours} hrs, Acceptance: ${data.summary.acceptance_rate}%, Breakdowns/Issues: ${data.summary.total_issues}`]);
      rows.push([]); // blank line

      // Table columns
      rows.push([
        'Delivery ID',
        'Date & Completed At',
        'Driver Name',
        'Vehicle Type',
        'Vehicle Number',
        'Origin (Source)',
        'Destination Hospital',
        'Urgency Level',
        'Distance (km)',
        'Transit Duration (mins)',
        'Status',
        'Notes',
      ]);

      const trips = data.workLogs.length > 0 ? data.workLogs : data.assignments;
      for (const t of trips) {
        rows.push([
          `"${t.id || t.assignment_id || ''}"`,
          `"${t.completed_at || t.assigned_at || ''}"`,
          `"${t.driver_name || ''}"`,
          `"${t.vehicle_type === 'four_wheeler' ? 'Four Wheeler (Van/Car)' : 'Two Wheeler (Bike)'}"`,
          `"${t.vehicle_number || ''}"`,
          `"${t.source_name || ''}"`,
          `"${t.destination_name || ''}"`,
          `"${(t.urgency || 'normal').toUpperCase()}"`,
          parseFloat(t.distance_km || 0).toFixed(1),
          t.duration_mins || 0,
          `"${(t.status || 'completed').toUpperCase()}"`,
          `"${(t.notes || '').replace(/"/g, '""')}"`,
        ]);
      }

      const csvContent = rows.map(r => r.join(',')).join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="raktdoot-driver-report-${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    } else {
      // Hospital Report CSV
      const data = reportsService.getHospitalReport({ destinationId, period, startDate, endDate });
      const rows = [];

      rows.push(['# RAKTDOOT TRACKER - JANKALYAN BLOOD CENTRE PUNE']);
      rows.push([`# HOSPITAL DELIVERY WISE REPORT - Period: ${data.period} (${data.startDate} to ${data.endDate})`]);
      if (data.targetHospital) {
        rows.push([`# Hospital: ${data.targetHospital.name} | Address: ${data.targetHospital.address || 'Pune'} | Radius: ${data.targetHospital.radius_m}m`]);
      }
      rows.push([`# Summary: Total Deliveries: ${data.summary.total_deliveries}, Emergency STAT: ${data.summary.emergency_count}, Urgent: ${data.summary.urgent_count}, Normal: ${data.summary.normal_count}, Avg Delivery Time: ${data.summary.avg_delivery_mins} mins, Total Distance: ${data.summary.total_distance_km} km, Unique Drivers: ${data.summary.unique_drivers_count}, Geofence Proximity Hits: ${data.summary.geofence_arrivals_count}`]);
      rows.push([]);

      rows.push([
        'Delivery ID',
        'Completed Date & Time',
        'Hospital Destination',
        'Hospital Address',
        'Assigned Driver',
        'Driver Phone',
        'Vehicle Type',
        'Vehicle Number',
        'Origin Dispatch Hub',
        'Urgency Level',
        'Distance (km)',
        'Delivery Duration (mins)',
        'Notes',
      ]);

      for (const d of data.deliveries) {
        rows.push([
          `"${d.id || d.assignment_id || ''}"`,
          `"${d.completed_at || ''}"`,
          `"${d.destination_name || ''}"`,
          `"${(d.destination_address || '').replace(/"/g, '""')}"`,
          `"${d.driver_name || ''}"`,
          `"${d.driver_phone || ''}"`,
          `"${d.vehicle_type === 'four_wheeler' ? 'Four Wheeler (Van/Car)' : 'Two Wheeler (Bike)'}"`,
          `"${d.vehicle_number || ''}"`,
          `"${d.source_name || ''}"`,
          `"${(d.urgency || 'normal').toUpperCase()}"`,
          parseFloat(d.distance_km || 0).toFixed(1),
          d.duration_mins || 0,
          `"${(d.notes || '').replace(/"/g, '""')}"`,
        ]);
      }

      const csvContent = rows.map(r => r.join(',')).join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="raktdoot-hospital-report-${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDriverReport,
  getHospitalReport,
  exportCSV,
};
