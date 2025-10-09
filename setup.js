#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupProject() {
  console.log('🚀 Configuration automatique de Sol Numérique\n');

  try {
    // 1. Configuration de la base de données
    console.log('📊 Configuration Base de Données MySQL');
    const dbHost = await question('Host MySQL (localhost): ') || 'localhost';
    const dbPort = await question('Port MySQL (3306): ') || '3306';
    const dbName = await question('Nom de la base (soldb): ') || 'soldb';
    const dbUser = await question('Utilisateur MySQL: ');
    const dbPassword = await question('Mot de passe MySQL: ');

    // 2. Configuration Stripe (optionnel pour les tests)
    console.log('\n💳 Configuration Stripe (optionnel - mode test)');
    const stripeSecretKey = await question('Stripe Secret Key (sk_test_... ou skip): ') || 'sk_test_51234567890';
    const stripePublishableKey = await question('Stripe Publishable Key (pk_test_... ou skip): ') || 'pk_test_51234567890';

    // 3. Configuration Email (optionnel)
    console.log('\n📧 Configuration Email (optionnel)');
    const emailService = await question('Service Email (gmail/outlook/skip): ') || 'skip';
    let emailConfig = {};
    
    if (emailService !== 'skip') {
      emailConfig.user = await question('Email utilisateur: ');
      emailConfig.password = await question('Mot de passe email: ');
    }

    // 4. Création des fichiers .env
    await createEnvFiles({
      db: { host: dbHost, port: dbPort, name: dbName, user: dbUser, password: dbPassword },
      stripe: { secretKey: stripeSecretKey, publishableKey: stripePublishableKey },
      email: emailConfig
    });

    // 5. Installation des dépendances
    console.log('\n📦 Installation des dépendances...');
    console.log('   - Dépendances principales...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('   - Dépendances backend...');
    execSync('cd backend && npm install', { stdio: 'inherit' });
    
    console.log('   - Dépendances frontend...');
    execSync('cd frontend && npm install', { stdio: 'inherit' });

    // 6. Configuration de la base de données
    console.log('\n🗄️ Configuration de la base de données...');
    await setupDatabase({ host: dbHost, port: dbPort, name: dbName, user: dbUser, password: dbPassword });

    // 7. Instructions finales
    console.log('\n✅ Configuration terminée !');
    console.log('\n🚀 Pour démarrer le projet :');
    console.log('   npm run dev        # Mode développement');
    console.log('   npm run build      # Build production');
    console.log('   npm test           # Lancer les tests');
    console.log('\n📱 URLs locales :');
    console.log('   Frontend: http://localhost:3001');
    console.log('   Backend:  http://localhost:3000');
    console.log('\n👤 Compte admin créé :');
    console.log('   Email: admin@sol-local.com');
    console.log('   Mot de passe: Admin123!');

  } catch (error) {
    console.error('❌ Erreur lors du setup:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function createEnvFiles(config) {
  // Backend .env
  const backendEnv = `# Application
NODE_ENV=development
PORT=3000
APP_VERSION=1.0.0

# Database
DB_HOST=${config.db.host}
DB_PORT=${config.db.port}
DB_NAME=${config.db.name}
DB_USER=${config.db.user}
DB_PASSWORD=${config.db.password}
DATABASE_URL=mysql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.name}

# JWT
JWT_SECRET=${generateRandomString(64)}
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Stripe
STRIPE_SECRET_KEY=${config.stripe.secretKey}
STRIPE_PUBLISHABLE_KEY=${config.stripe.publishableKey}
STRIPE_WEBHOOK_SECRET=whsec_${generateRandomString(32)}

# Email
${config.email.user ? `EMAIL_USER=${config.email.user}` : '# EMAIL_USER=your-email@example.com'}
${config.email.password ? `EMAIL_PASSWORD=${config.email.password}` : '# EMAIL_PASSWORD=your-email-password'}
FROM_EMAIL=noreply@sol-local.com

# Security
SESSION_SECRET=${generateRandomString(32)}
BCRYPT_ROUNDS=12
MFA_ISSUER=Sol Numérique Local

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Development
LOG_LEVEL=debug
`;

  // Frontend .env
  const frontendEnv = `REACT_APP_API_URL=http://localhost:3000
REACT_APP_STRIPE_PUBLISHABLE_KEY=${config.stripe.publishableKey}
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=1.0.0
`;

  // Écriture des fichiers
  fs.writeFileSync(path.join(__dirname, 'backend', '.env'), backendEnv);
  fs.writeFileSync(path.join(__dirname, 'frontend', '.env'), frontendEnv);
  
  console.log('✅ Fichiers .env créés');
}

async function setupDatabase(config) {
  try {
    const mysql = require('mysql2/promise');
    
    // Connexion sans base pour la créer
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });

    // Création de la base
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de données '${config.name}' créée`);
    
    await connection.end();

    // Connexion à la base créée pour les tables
    const dbConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.name
    });

    // Création des tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        firstname VARCHAR(100) NOT NULL,
        lastname VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        compte_bancaire_encrypted TEXT,
        role ENUM('member', 'admin') DEFAULT 'member',
        mfa_secret VARCHAR(255),
        mfa_enabled BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      )`,
      
      `CREATE TABLE IF NOT EXISTS sols (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nom VARCHAR(200) NOT NULL,
        description TEXT,
        montant_par_periode DECIMAL(10,2) NOT NULL,
        frequence ENUM('weekly', 'monthly', 'quarterly') NOT NULL,
        statut ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
        created_by INT NOT NULL,
        max_participants INT DEFAULT 12,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_statut (statut),
        INDEX idx_created_by (created_by)
      )`,
      
      `CREATE TABLE IF NOT EXISTS participations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sol_id INT NOT NULL,
        user_id INT NOT NULL,
        ordre INT NOT NULL,
        statut_tour ENUM('en_attente', 'paye', 'valide', 'complete') DEFAULT 'en_attente',
        date_tour DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sol_id) REFERENCES sols(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE KEY unique_sol_user (sol_id, user_id),
        UNIQUE KEY unique_sol_ordre (sol_id, ordre),
        INDEX idx_sol_ordre (sol_id, ordre)
      )`,
      
      `CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        participation_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method ENUM('stripe', 'offline') NOT NULL,
        status ENUM('pending', 'uploaded', 'validated', 'rejected', 'completed') DEFAULT 'pending',
        receipt_path VARCHAR(500),
        stripe_session_id VARCHAR(200),
        stripe_payment_intent_id VARCHAR(200),
        validated_by INT,
        validated_at TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (participation_id) REFERENCES participations(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (validated_by) REFERENCES users(id),
        INDEX idx_status (status),
        INDEX idx_method (method),
        INDEX idx_user_id (user_id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INT,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user_action (user_id, action),
        INDEX idx_created_at (created_at)
      )`
    ];

    for (const table of tables) {
      await dbConnection.execute(table);
    }

    console.log('✅ Tables créées avec succès');

    // Création d'un utilisateur admin par défaut
    const adminExists = await dbConnection.execute(
      'SELECT id FROM users WHERE email = ? AND role = "admin"',
      ['admin@sol-local.com']
    );

    if (adminExists[0].length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = bcrypt.genSaltSync(12);
      const hashedPassword = bcrypt.hashSync('Admin123!', salt);

      await dbConnection.execute(
        `INSERT INTO users (firstname, lastname, email, password_hash, salt, role, email_verified) 
         VALUES (?, ?, ?, ?, ?, 'admin', TRUE)`,
        ['Admin', 'Sol', 'admin@sol-local.com', hashedPassword, salt]
      );
      
      console.log('✅ Utilisateur admin créé : admin@sol-local.com / Admin123!');
    }

    await dbConnection.end();
  } catch (error) {
    console.error('❌ Erreur base de données:', error.message);
    throw error;
  }
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Lancement du setup
setupProject();