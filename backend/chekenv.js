require('dotenv').config();

console.log('🔍 Vérification des variables d\'environnement AWS:\n');

const checks = {
  'AWS_REGION': process.env.AWS_REGION,
  'AWS_ACCESS_KEY_ID': process.env.AWS_ACCESS_KEY_ID,
  'AWS_SECRET_ACCESS_KEY': process.env.AWS_SECRET_ACCESS_KEY,
  'AWS_S3_BUCKET_NAME': process.env.AWS_S3_BUCKET_NAME
};

for (const [key, value] of Object.entries(checks)) {
  if (!value) {
    console.log(`❌ ${key}: MANQUANT`);
  } else {
    const display = key === 'AWS_SECRET_ACCESS_KEY' 
      ? value.substring(0, 4) + '****' + value.substring(value.length - 4)
      : value;
    console.log(`✅ ${key}: ${display}`);
  }
}

console.log('\n📋 Détails complets:');
console.log('- Access Key commence par:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 4));
console.log('- Access Key longueur:', process.env.AWS_ACCESS_KEY_ID?.length);
console.log('- Secret Key commence par:', process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 4));
console.log('- Secret Key longueur:', process.env.AWS_SECRET_ACCESS_KEY?.length);