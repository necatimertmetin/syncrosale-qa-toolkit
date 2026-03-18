#!/usr/bin/env node

/**
 * Test Tool Helper Script
 * Enables running V2 Entity Validation and other tools from command line
 * 
 * Usage:
 *   npm run v2-validate                          # Interactive with .env
 *   npm run v2-validate -- --db-host=prod.db    # Override host
 *   npm run v2-validate -- --db-port=5432       # Override port
 * 
 * Environment:
 *   Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env or pass as --args
 */

require("dotenv").config();

const path = require("path");
const v2Validator = require("./src/checks/data/v2-entity-validation/run.js");

// Script is auto-executed when imported
// Just ensure it exists for npm script reference
