/**
 * rebuild_geohash_mysql2.js
 * Rebuild geohash(12) for station + hotel using ngeohash, update with mysql2 (no prisma).
 */

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import ngeohash from 'ngeohash';
dotenv.config();

const PRECISION = 12;

// If your real MySQL table names differ, change here:
const TABLE_STATION = "station";
const TABLE_HOTEL = "hotel";

// Batch sizes
const SELECT_BATCH = 2000;
const UPDATE_BATCH = 500;

function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function validLatLon(lat, lon) {
  return (
    lat !== null &&
    lon !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function gh(lat, lon) {
  return ngeohash.encode(lat, lon, PRECISION);
}

/**
 * Rebuild station geohash.
 * Strategy:
 *  - Prefer latitude_d/longitude_d (DECIMAL) if present
 *  - Else parse lat/lon string; if parse ok -> also fill latitude_d/longitude_d
 */
async function rebuildStations(conn) {
  console.log(`\n==> Rebuilding geohash for ${TABLE_STATION} ...`);

  const selectSql = `
    SELECT id, lat, lon, latitude_d, longitude_d, geohash
    FROM ${TABLE_STATION}
    ORDER BY id
    LIMIT ? OFFSET ?
  `;

  // Update can also backfill latitude_d/longitude_d
  const updateSql = `
    UPDATE ${TABLE_STATION}
    SET geohash = ?,
        latitude_d = ?,
        longitude_d = ?
    WHERE id = ?
  `;

  let offset = 0;
  let read = 0, updated = 0, skipped = 0;

  while (true) {
    const [rows] = await conn.query(selectSql, [SELECT_BATCH, offset]);
    if (!rows.length) break;
    read += rows.length;

    const updates = [];

    for (const r of rows) {
      // Prefer decimal columns
      let lat = toNum(r.latitude_d);
      let lon = toNum(r.longitude_d);

      // Fallback to string columns
      if (!validLatLon(lat, lon)) {
        lat = toNum(r.lat);
        lon = toNum(r.lon);
      }

      if (!validLatLon(lat, lon)) {
        skipped++;
        continue;
      }

      const newGh = gh(lat, lon);
      const oldGh = r.geohash ? String(r.geohash).trim() : "";

      // skip if unchanged AND decimals already present (optional optimization)
      if (oldGh === newGh && validLatLon(toNum(r.latitude_d), toNum(r.longitude_d))) {
        continue;
      }

      updates.push([newGh, lat, lon, r.id]);
    }

    for (let i = 0; i < updates.length; i += UPDATE_BATCH) {
      const chunk = updates.slice(i, i + UPDATE_BATCH);
      await conn.beginTransaction();
      try {
        for (const params of chunk) {
          await conn.query(updateSql, params);
          updated++;
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    }

    console.log(`    offset=${offset} read=${rows.length} updates=${updates.length} updatedSoFar=${updated} skippedBad=${skipped}`);
    offset += SELECT_BATCH;
  }

  console.log(`==> DONE ${TABLE_STATION}: read=${read}, updated=${updated}, skippedBadLatLon=${skipped}`);
}

/**
 * Rebuild hotel geohash.
 * Strategy:
 *  - Use latitude/longitude DECIMAL(10,7)
 *  - If missing -> skip
 */
async function rebuildHotels(conn) {
  console.log(`\n==> Rebuilding geohash for ${TABLE_HOTEL} ...`);

  const selectSql = `
    SELECT id, latitude, longitude, geohash
    FROM ${TABLE_HOTEL}
    ORDER BY id
    LIMIT ? OFFSET ?
  `;

  const updateSql = `
    UPDATE ${TABLE_HOTEL}
    SET geohash = ?
    WHERE id = ?
  `;

  let offset = 0;
  let read = 0, updated = 0, skipped = 0;

  while (true) {
    const [rows] = await conn.query(selectSql, [SELECT_BATCH, offset]);
    if (!rows.length) break;
    read += rows.length;

    const updates = [];
    for (const r of rows) {
      const lat = toNum(r.latitude);
      const lon = toNum(r.longitude);

      if (!validLatLon(lat, lon)) {
        skipped++;
        continue;
      }

      const newGh = gh(lat, lon);
      const oldGh = r.geohash ? String(r.geohash).trim() : "";

      // hotel.geohash is NOT NULL in schema; but still safe
      if (oldGh === newGh) continue;

      updates.push([newGh, r.id]);
    }

    for (let i = 0; i < updates.length; i += UPDATE_BATCH) {
      const chunk = updates.slice(i, i + UPDATE_BATCH);
      await conn.beginTransaction();
      try {
        for (const params of chunk) {
          await conn.query(updateSql, params);
          updated++;
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
    }

    console.log(`    offset=${offset} read=${rows.length} updates=${updates.length} updatedSoFar=${updated} skippedBad=${skipped}`);
    offset += SELECT_BATCH;
  }

  console.log(`==> DONE ${TABLE_HOTEL}: read=${read}, updated=${updated}, skippedBadLatLon=${skipped}`);
}

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
  });

  const conn = await pool.getConnection();
  try {
    // Ensure stable behavior
    await conn.query("SET time_zone = '+00:00'");

    await rebuildStations(conn);
    await rebuildHotels(conn);

    console.log("\nAll done ✅");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
