import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// Support both TCP (DB_HOST/DB_PORT) and Unix socket (Cloud Run / Cloud SQL)
const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME; // e.g. my-project:asia-south1:instance

const commonConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'postgres',
  max: 10
};

let poolConfig;
if (instanceConnectionName) {
  // Use Unix socket path for Cloud SQL (Cloud Run mounts /cloudsql/<INSTANCE>)
  poolConfig = {
    ...commonConfig,
    host: `/cloudsql/${instanceConnectionName}`,
    // Do not set port for unix socket; pg will use socket.
  };
} else {
  poolConfig = {
    ...commonConfig,
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432)
  };
}

export const pool = new Pool(poolConfig);

export async function query(text, params) {
  return pool.query(text, params);
}


