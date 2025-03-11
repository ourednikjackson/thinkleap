#!/usr/bin/env node
/**
 * Test for OAI-PMH Search Integration
 * 
 * This file contains SQL queries that can be run against the thinkleap database
 * to test the OAI-PMH integration. These queries can be executed directly in
 * psql or any PostgreSQL client.
 * 
 * Here are the key SQL queries for testing:
 */

/*
-- Count active OAI-PMH sources
SELECT COUNT(*) FROM oai_pmh_sources WHERE status = 'active';

-- List all OAI-PMH sources with their details
SELECT id, name, provider, base_url, metadata_prefix, status, last_harvested 
FROM oai_pmh_sources;

-- Count harvested metadata records per source
SELECT s.name, s.provider, COUNT(hm.id) as record_count
FROM oai_pmh_sources s
LEFT JOIN harvested_metadata hm ON s.id = hm.source_id
GROUP BY s.id, s.name, s.provider;

-- Search harvested metadata for a specific term
SELECT 
  hm.id, 
  hm.record_id, 
  hm.title, 
  hm.abstract,
  hm.publication_date, 
  s.name as source_name
FROM harvested_metadata hm
JOIN oai_pmh_sources s ON hm.source_id = s.id
WHERE to_tsvector('english', hm.title || ' ' || COALESCE(hm.abstract, '')) @@ plainto_tsquery('english', 'science')
LIMIT 5;
*/

// Note: This is now just a reference file. 
// Please execute the SQL queries directly in the database client.

// Set up CLI arguments
const searchTerm = process.argv[2] || 'test';
const limit = 10;

