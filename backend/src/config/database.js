const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class DatabaseConfig {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async createPool() {
    if (!this.pool) {
      try {
        this.pool = mysql.createPool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 3306,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          acquireTimeout: 60000,
          timeout: 60000,
          reconnect: true,
          charset: 'utf8mb4',
          timezone: 'Z',
          multipleStatements: false
        });

        // Test de connexion
        const connection = await this.pool.getConnection();
        await connection.ping();
        connection.release();
        
        this.isConnected = true;
        logger.info('✅ Database connection established successfully', {
          host: process.env.DB_HOST,
          database: process.env.DB_NAME
        });
      } catch (error) {
        logger.error('❌ Database connection failed:', error);
        throw error;
      }
    }

    return this.pool;
  }

  async executeQuery(query, params = []) {
    try {
      const pool = await this.createPool();
      const [results] = await pool.execute(query, params);
      
      logger.debug('Query executed', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        paramsCount: params.length,
        resultsCount: Array.isArray(results) ? results.length : 1
      });
      
      return results;
    } catch (error) {
      logger.error('Database query error:', {
        error: error.message,
        query: query.substring(0, 100),
        sqlState: error.sqlState,
        errno: error.errno
      });
      throw error;
    }
  }

  async executeTransaction(queries) {
    const pool = await this.createPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const { query, params } of queries) {
        const [result] = await connection.execute(query, params);
        results.push(result);
      }

      await connection.commit();
      
      logger.info('Transaction completed successfully', {
        queriesCount: queries.length
      });
      
      return results;
    } catch (error) {
      await connection.rollback();
      logger.error('Transaction failed, rolling back:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database pool closed');
    }
  }

  // Utilitaires pour les tests
  async truncateTable(tableName) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('truncateTable only allowed in test environment');
    }
    await this.executeQuery(`TRUNCATE TABLE ${tableName}`);
  }

  async resetAutoIncrement(tableName) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetAutoIncrement only allowed in test environment');
    }
    await this.executeQuery(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
  }
}

module.exports = new DatabaseConfig();